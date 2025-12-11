package main

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"

	"blockchain-wallet/pkg/blockchain"
	"blockchain-wallet/pkg/crypto"
	"blockchain-wallet/pkg/db"
	"blockchain-wallet/pkg/email" // <--- ENSURE THIS IMPORT EXISTS
	"blockchain-wallet/pkg/scheduler"
	"blockchain-wallet/pkg/tx"
	"blockchain-wallet/pkg/utxo"
)

var utxoMgr = utxo.NewManager()
var dbClient *db.Client
var bc *blockchain.Blockchain
var zakatScheduler *scheduler.ZakatScheduler

func init() {
	// 1. Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("⚠️  Warning: .env file not found. Ensure it is in the same directory as the binary.")
	}

	// 2. Debug Email Settings
	emailParams := os.Getenv("SMTP_EMAIL")
	emailPass := os.Getenv("SMTP_PASSWORD")
	if emailParams != "" && len(emailPass) > 0 {
		log.Printf("📧 Email Config Loaded: Sending as %s", emailParams)
	} else {
		log.Println("❌ Email Config MISSING in .env! Emails will fail.")
	}

	// 3. Connect DB
	dbClient, err = db.NewClient(context.Background())
	if err != nil {
		log.Printf("❌ CRITICAL: DB connection failed: %v", err)
		dbClient = nil // Explicitly nil so handlers fail gracefully
	} else {
		log.Printf("✓ Database connected successfully")
	}

	// 4. Init Blockchain & Scheduler
	bc = blockchain.NewBlockchain(5)
	zakatScheduler = scheduler.NewZakatScheduler(dbClient, bc, utxoMgr, "zakat-pool-system")
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	defer func() {
		if dbClient != nil {
			dbClient.Close()
		}
		if zakatScheduler != nil {
			zakatScheduler.Stop()
		}
	}()

	if dbClient != nil {
		ctx := context.Background()
		zakatScheduler.Start(ctx)
	}

	mux := http.NewServeMux()
	
	// --- AUTH ENDPOINTS ---
	mux.HandleFunc("/auth/signup", signupHandler)
	mux.HandleFunc("/auth/verify-otp", verifyOtpHandler)
	mux.HandleFunc("/auth/login", loginHandler)
	
	// --- OTHER ENDPOINTS ---
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/wallet/create", createWalletHandler)
	mux.HandleFunc("/wallet/fund", fundHandler)
	mux.HandleFunc("/wallet/balance", balanceHandler)
	mux.HandleFunc("/tx/submit", txSubmitHandler)
	mux.HandleFunc("/tx/sign-and-submit", txSignAndSubmitHandler)
	mux.HandleFunc("/tx/details", txDetailsHandler)
	mux.HandleFunc("/blockchain/mine", mineHandler)
	mux.HandleFunc("/blockchain/blocks", blocksHandler)
	mux.HandleFunc("/blockchain/validate", validateHandler)
	mux.HandleFunc("/blockchain/pending", pendingHandler)

	if dbClient != nil {
		mux.HandleFunc("/profile/get", profileGetHandler)
		mux.HandleFunc("/profile/update", profileUpdateHandler)
		mux.HandleFunc("/profile/beneficiaries", beneficiariesListHandler)
		mux.HandleFunc("/profile/beneficiaries/add", beneficiariesAddHandler)
		mux.HandleFunc("/profile/beneficiaries/remove", beneficiariesRemoveHandler)
		mux.HandleFunc("/wallet/history", transactionHistoryHandler)
		mux.HandleFunc("/admin/logs", logsHandler)
		mux.HandleFunc("/auth/request-email-change", requestEmailChangeHandler)
		mux.HandleFunc("/auth/confirm-email-change", confirmEmailChangeHandler)
	}

	if zakatScheduler != nil {
		mux.HandleFunc("/zakat/trigger", zakatTriggerHandler)
		mux.HandleFunc("/zakat/pool-balance", zakatPoolBalanceHandler)
	}

	// Use PORT from environment (for Render/cloud deployment) or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := ":" + port
	log.Printf("🚀 Server listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, corsMiddleware(mux)))
}

// generateOTP returns a 6-digit numeric OTP as string
func generateOTP() (string, error) {
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
}

type CreateWalletResp struct {
	WalletID   string `json:"wallet_id"`
	PublicKey  string `json:"public_key"`
	PrivateKey string `json:"private_key"` // WARNING: for demo only
}

func createWalletHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	priv, pub, err := crypto.GenerateKeypair()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	id := crypto.WalletIDFromPub(pub)
	resp := CreateWalletResp{
		WalletID:   id,
		PublicKey:  base64.StdEncoding.EncodeToString(pub),
		PrivateKey: base64.StdEncoding.EncodeToString(priv),
	}
	writeJSON(w, resp)
}

type FundReq struct {
	WalletID string `json:"wallet_id"`
	Amount   int64  `json:"amount"`
}

func fundHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var fr FundReq
	if err := json.NewDecoder(r.Body).Decode(&fr); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	id := utxoMgr.AddUTXO(fr.WalletID, fr.Amount)
	if dbClient != nil {
		if err := dbClient.InsertUTXO(context.Background(), id, fr.WalletID, fr.Amount); err != nil {
			log.Printf("Warning: failed to log UTXO to DB: %v", err)
		}
	}
	writeJSON(w, map[string]string{"utxo_id": id})
}

func balanceHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	wallet := r.URL.Query().Get("wallet")
	if wallet == "" {
		http.Error(w, "missing wallet param", http.StatusBadRequest)
		return
	}

	var bal int64
	var utxoList []map[string]interface{}
	
	if dbClient != nil {
		var err error
		bal, err = dbClient.GetBalance(context.Background(), wallet)
		if err != nil {
			log.Printf("Warning: failed to get balance from DB: %v", err)
			bal = utxoMgr.Balance(wallet)
		}
		
		// Get UTXOs from database
		dbUtxos, err := dbClient.GetUnspentUTXOs(context.Background(), wallet)
		if err != nil {
			log.Printf("Warning: failed to get UTXOs from DB: %v", err)
		} else {
			utxoList = dbUtxos
		}
	} else {
		bal = utxoMgr.Balance(wallet)
		
		// Get UTXOs from in-memory manager
		memUtxos := utxoMgr.GetUnspentByOwner(wallet)
		for _, u := range memUtxos {
			utxoList = append(utxoList, map[string]interface{}{
				"utxo_id": u.ID,
				"amount":  u.Amount,
			})
		}
	}

	writeJSON(w, map[string]interface{}{
		"wallet":  wallet,
		"balance": bal,
		"utxos":   utxoList,
	})
}

type APITx struct {
	SenderID   string   `json:"sender_id"`
	ReceiverID string   `json:"receiver_id"`
	Amount     int64    `json:"amount"`
	Note       string   `json:"note"`
	Inputs     []string `json:"inputs"`
	SenderPub  string   `json:"sender_pub"`  // base64
	Signature  string   `json:"signature"`   // base64
}

func txSubmitHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var at APITx
	if err := json.NewDecoder(r.Body).Decode(&at); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	// build transaction
	txx := tx.NewTransaction(at.SenderID, at.ReceiverID, at.Amount, at.Note, at.Inputs)

	// decode pub and sig
	pubb, err := base64.StdEncoding.DecodeString(at.SenderPub)
	if err != nil {
		http.Error(w, "invalid sender_pub", http.StatusBadRequest)
		return
	}
	sigb, err := base64.StdEncoding.DecodeString(at.Signature)
	if err != nil {
		http.Error(w, "invalid signature", http.StatusBadRequest)
		return
	}
	txx.SenderPub = pubb
	txx.Signature = sigb

	// verify signature
	if !crypto.VerifySignature(ed25519.PublicKey(pubb), txx.Payload(), sigb) {
		http.Error(w, "signature invalid", http.StatusBadRequest)
		return
	}

	// validate inputs exist and belong to sender and are unspent
	var total int64
	for _, in := range txx.InputUTXOs {
		u := utxoMgr.GetUTXO(in)
		if u == nil {
			http.Error(w, "input utxo not found: "+in, http.StatusBadRequest)
			return
		}
		if u.Owner != txx.SenderID {
			http.Error(w, "input owner mismatch", http.StatusBadRequest)
			return
		}
		if u.Spent {
			http.Error(w, "input already spent", http.StatusBadRequest)
			return
		}
		total += u.Amount
	}
	if total < txx.Amount {
		http.Error(w, "insufficient funds", http.StatusBadRequest)
		return
	}

	// spend inputs
	for _, in := range txx.InputUTXOs {
		if err := utxoMgr.Spend(in, txx.SenderID); err != nil {
			http.Error(w, "failed to spend input: "+err.Error(), http.StatusInternalServerError)
			return
		}
		if dbClient != nil {
			if err := dbClient.SpendUTXO(context.Background(), in, txx.ID); err != nil {
				log.Printf("Warning: failed to mark UTXO as spent in DB: %v", err)
			}
		}
	}

	// create receiver utxo
	utxoMgr.AddUTXO(txx.ReceiverID, txx.Amount)
	if dbClient != nil {
		if err := dbClient.InsertUTXO(context.Background(), txx.ID+"_recv", txx.ReceiverID, txx.Amount); err != nil {
			log.Printf("Warning: failed to insert receiver UTXO in DB: %v", err)
		}
	}

	// create change utxo if any
	change := total - txx.Amount
	if change > 0 {
		utxoMgr.AddUTXO(txx.SenderID, change)
		if dbClient != nil {
			if err := dbClient.InsertUTXO(context.Background(), txx.ID+"_change", txx.SenderID, change); err != nil {
				log.Printf("Warning: failed to insert change UTXO in DB: %v", err)
			}
		}
	}

	if dbClient != nil {
		if err := dbClient.InsertTransaction(context.Background(), txx.ID, txx.SenderID, txx.ReceiverID, txx.Amount, txx.Note, txx.Signature, txx.SenderPub, r.RemoteAddr); err != nil {
			log.Printf("Warning: failed to log transaction in DB: %v", err)
		}
		if err := dbClient.InsertLog(context.Background(), txx.SenderID, "tx_sent", "Transfer to "+txx.ReceiverID, "confirmed", r.RemoteAddr); err != nil {
			log.Printf("Warning: failed to log action in DB: %v", err)
		}
	}

	writeJSON(w, map[string]interface{}{"status": "accepted", "txid": txx.ID})

	// Add transaction to pending pool for mining
	bc.AddPendingTransaction(txx.ID)
}

// APITxWithPrivKey is used for the sign-and-submit endpoint where client sends private key
type APITxWithPrivKey struct {
	SenderID   string `json:"sender_id"`
	ReceiverID string `json:"receiver_id"`
	Amount     int64  `json:"amount"`
	Note       string `json:"note"`
	SenderPub  string `json:"sender_pub"`  // base64
	SenderPriv string `json:"sender_priv"` // base64
}

// txSignAndSubmitHandler signs the transaction server-side and submits it
// This is a convenience endpoint that handles signing for the client
func txSignAndSubmitHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var req APITxWithPrivKey
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	// Decode private key
	privBytes, err := base64.StdEncoding.DecodeString(req.SenderPriv)
	if err != nil {
		http.Error(w, "invalid sender_priv: "+err.Error(), http.StatusBadRequest)
		return
	}
	
	// Decode public key
	pubBytes, err := base64.StdEncoding.DecodeString(req.SenderPub)
	if err != nil {
		http.Error(w, "invalid sender_pub: "+err.Error(), http.StatusBadRequest)
		return
	}
	
	// Verify that the private key corresponds to the public key
	if len(privBytes) != ed25519.PrivateKeySize {
		http.Error(w, "invalid private key size", http.StatusBadRequest)
		return
	}
	
	privKey := ed25519.PrivateKey(privBytes)
	derivedPub := privKey.Public().(ed25519.PublicKey)
	
	if !bytes.Equal(derivedPub, pubBytes) {
		http.Error(w, "private key does not match public key", http.StatusBadRequest)
		return
	}
	
	// Verify wallet ID matches the public key
	expectedWalletID := crypto.WalletIDFromPub(pubBytes)
	if expectedWalletID != req.SenderID {
		http.Error(w, "sender_id does not match public key", http.StatusBadRequest)
		return
	}
	
	// Get UTXOs for the sender - prefer database over in-memory
	var selectedInputs []string
	var totalInput int64
	
	if dbClient != nil {
		// Use database UTXOs (persistent)
		dbUtxos, err := dbClient.GetUnspentUTXOs(context.Background(), req.SenderID)
		if err != nil {
			log.Printf("Warning: failed to get UTXOs from DB: %v", err)
		}
		if len(dbUtxos) == 0 {
			http.Error(w, "no UTXOs available for sender", http.StatusBadRequest)
			return
		}
		
		// Select UTXOs to cover the amount
		for _, u := range dbUtxos {
			utxoID := u["utxo_id"].(string)
			amount := u["amount"].(int64)
			selectedInputs = append(selectedInputs, utxoID)
			totalInput += amount
			if totalInput >= req.Amount {
				break
			}
		}
	} else {
		// Fallback to in-memory UTXOs
		utxos := utxoMgr.GetUnspentByOwner(req.SenderID)
		if len(utxos) == 0 {
			http.Error(w, "no UTXOs available for sender", http.StatusBadRequest)
			return
		}
		
		// Select UTXOs to cover the amount
		for _, u := range utxos {
			selectedInputs = append(selectedInputs, u.ID)
			totalInput += u.Amount
			if totalInput >= req.Amount {
				break
			}
		}
	}
	
	if totalInput < req.Amount {
		http.Error(w, fmt.Sprintf("insufficient funds: have %d, need %d", totalInput, req.Amount), http.StatusBadRequest)
		return
	}
	
	// Create the transaction
	txx := tx.NewTransaction(req.SenderID, req.ReceiverID, req.Amount, req.Note, selectedInputs)
	txx.SenderPub = pubBytes
	
	// Sign the transaction payload
	payload := txx.Payload()
	signature := crypto.SignPayload(privKey, payload)
	txx.Signature = signature
	
	// Verify signature before proceeding
	if !crypto.VerifySignature(pubBytes, payload, signature) {
		http.Error(w, "internal error: signature verification failed", http.StatusInternalServerError)
		return
	}
	
	// Spend inputs - use DB if available, otherwise in-memory
	for _, in := range txx.InputUTXOs {
		if dbClient != nil {
			// Spend in database (primary)
			if err := dbClient.SpendUTXO(context.Background(), in, txx.ID); err != nil {
				http.Error(w, "failed to spend input in DB: "+err.Error(), http.StatusInternalServerError)
				return
			}
		} else {
			// Fallback to in-memory
			if err := utxoMgr.Spend(in, txx.SenderID); err != nil {
				http.Error(w, "failed to spend input: "+err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}
	
	// Create receiver UTXO
	receiverUtxoID := txx.ID + "_recv"
	if dbClient != nil {
		if err := dbClient.InsertUTXO(context.Background(), receiverUtxoID, txx.ReceiverID, txx.Amount); err != nil {
			log.Printf("Warning: failed to insert receiver UTXO in DB: %v", err)
		}
	}
	utxoMgr.AddUTXO(txx.ReceiverID, txx.Amount)
	
	// Create change UTXO if any
	change := totalInput - txx.Amount
	if change > 0 {
		changeUtxoID := txx.ID + "_change"
		if dbClient != nil {
			if err := dbClient.InsertUTXO(context.Background(), changeUtxoID, txx.SenderID, change); err != nil {
				log.Printf("Warning: failed to insert change UTXO in DB: %v", err)
			}
		}
		utxoMgr.AddUTXO(txx.SenderID, change)
	}
	
	// Log transaction
	if dbClient != nil {
		if err := dbClient.InsertTransaction(context.Background(), txx.ID, txx.SenderID, txx.ReceiverID, txx.Amount, txx.Note, txx.Signature, txx.SenderPub, r.RemoteAddr); err != nil {
			log.Printf("Warning: failed to log transaction in DB: %v", err)
		}
		if err := dbClient.InsertLog(context.Background(), txx.SenderID, "tx_sent", "Transfer to "+txx.ReceiverID, "confirmed", r.RemoteAddr); err != nil {
			log.Printf("Warning: failed to log action in DB: %v", err)
		}
	}
	
	writeJSON(w, map[string]interface{}{"status": "accepted", "txid": txx.ID})
	
	// Add transaction to pending pool for mining
	bc.AddPendingTransaction(txx.ID)
}

// txDetailsHandler returns full transaction details including signature
func txDetailsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	txID := r.URL.Query().Get("tx_id")
	if txID == "" {
		http.Error(w, "missing tx_id param", http.StatusBadRequest)
		return
	}
	
	if dbClient == nil {
		http.Error(w, "database not available", http.StatusServiceUnavailable)
		return
	}
	
	txData, err := dbClient.GetTransactionByID(context.Background(), txID)
	if err != nil {
		http.Error(w, "transaction not found: "+err.Error(), http.StatusNotFound)
		return
	}
	
	// Convert signature and public key to base64 for frontend display
	if sig, ok := txData["signature"].([]byte); ok && sig != nil {
		txData["signature_base64"] = base64.StdEncoding.EncodeToString(sig)
	}
	if pub, ok := txData["sender_public_key"].([]byte); ok && pub != nil {
		txData["sender_pub_base64"] = base64.StdEncoding.EncodeToString(pub)
	}
	
	writeJSON(w, txData)
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	enc.Encode(v)
}

type SignupReq struct {
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	CNIC     string `json:"cnic"`
}

// Don't forget to import "blockchain-wallet/pkg/email" at the top!

func signupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if dbClient == nil {
		http.Error(w, "Database connection failed", http.StatusInternalServerError)
		return
	}

	var sr SignupReq
	if err := json.NewDecoder(r.Body).Decode(&sr); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	code, err := generateOTP()
	if err != nil {
		http.Error(w, "failed to generate otp", http.StatusInternalServerError)
		return
	}
	expiresAt := time.Now().Add(10 * time.Minute)

	if err := dbClient.InsertOTP(context.Background(), sr.Email, code, expiresAt); err != nil {
		http.Error(w, "failed to store otp: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// REAL EMAIL SENDING
	if err := email.SendOTP(sr.Email, code); err != nil {
		log.Printf("❌ EMAIL FAILED to %s: %v", sr.Email, err)
		http.Error(w, "Failed to send email. Check backend logs.", http.StatusInternalServerError)
		return
	}

	log.Printf("✓ Email sent successfully to %s", sr.Email)

	writeJSON(w, map[string]interface{}{
		"status": "otp_sent",
		"email":  sr.Email,
		"message": "OTP sent to your email inbox.",
		// NO "otp" field here!
	})
}
type EmailChangeRequest struct {
	UserID   string `json:"user_id"`
	NewEmail string `json:"new_email"`
}

func requestEmailChangeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || dbClient == nil {
		http.Error(w, "method not allowed or DB unavailable", http.StatusMethodNotAllowed)
		return
	}

	var req EmailChangeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.NewEmail == "" || req.UserID == "" {
		http.Error(w, "user_id and new_email required", http.StatusBadRequest)
		return
	}

	code, err := generateOTP()
	if err != nil {
		http.Error(w, "failed to generate otp", http.StatusInternalServerError)
		return
	}
	expiresAt := time.Now().Add(10 * time.Minute)

	if err := dbClient.InsertOTP(context.Background(), req.NewEmail, code, expiresAt); err != nil {
		http.Error(w, "failed to store otp: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("Email-change OTP for %s = %s (expires %s)", req.NewEmail, code, expiresAt.Format(time.RFC3339))

	writeJSON(w, map[string]interface{}{
		"status": "otp_sent",
		"email":  req.NewEmail,
	})
}

// verifyOtpHandler verifies OTP and creates user+wallet
func verifyOtpHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || dbClient == nil {
		http.Error(w, "method not allowed or DB unavailable", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Email    string `json:"email"`
		Code     string `json:"code"`
		FullName string `json:"full_name"`
		CNIC     string `json:"cnic"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Validate password
	if err := crypto.ValidatePassword(req.Password); err != nil {
		http.Error(w, "invalid password: "+err.Error(), http.StatusBadRequest)
		return
	}

	ok, err := dbClient.VerifyOTP(context.Background(), req.Email, req.Code)
	if err != nil {
		http.Error(w, "failed to verify otp: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if !ok {
		http.Error(w, "invalid or expired otp", http.StatusBadRequest)
		return
	}

	// Hash password
	passwordHash := crypto.HashPassword(req.Password)

	// Create user record with password hash
	userID, err := dbClient.InsertUser(context.Background(), req.Email, req.FullName, req.CNIC)
	if err != nil {
		http.Error(w, "failed to create user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Update user password
	if err := dbClient.UpdateUserPassword(context.Background(), userID, passwordHash); err != nil {
		http.Error(w, "failed to set password: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Create wallet and encrypt private key
	priv, pub, err := crypto.GenerateKeypair()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	walletID := crypto.WalletIDFromPub(pub)

	encPriv, err := crypto.EncryptPrivateKey(priv)
	if err != nil {
		http.Error(w, "failed to encrypt private key: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if err := dbClient.InsertWallet(context.Background(), userID, walletID, pub, encPriv); err != nil {
		http.Error(w, "failed to create wallet: "+err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]interface{}{
		"user_id":    userID,
		"wallet_id":  walletID,
		"public_key": base64.StdEncoding.EncodeToString(pub),
	})
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || dbClient == nil {
		http.Error(w, "method not allowed or DB unavailable", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Get user by email
	userRow, err := dbClient.GetUserByEmail(context.Background(), req.Email)
	if err != nil {
		http.Error(w, "user not found", http.StatusUnauthorized)
		return
	}

	// Verify password
	passwordHash := userRow["password_hash"].(string)
	if !crypto.VerifyPassword(req.Password, passwordHash) {
		http.Error(w, "invalid password", http.StatusUnauthorized)
		return
	}

	userID := userRow["id"].(string)

	// Get wallet info
	walletRow, err := dbClient.GetUserWalletByUserID(context.Background(), userID)
	if err != nil {
		http.Error(w, "wallet not found: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Get encrypted private key and DECRYPT it for the frontend
	privKeyEnc := walletRow["private_key_encrypted"].([]byte)
	pubKey := walletRow["public_key"].([]byte)
	walletID := walletRow["wallet_id"].(string)

	// Decrypt the private key using the Server Master Key
	decryptedPrivKey, err := crypto.DecryptPrivateKey(privKeyEnc)
	if err != nil {
		log.Printf("Error decrypting private key for user %s: %v", userID, err)
		http.Error(w, "failed to decrypt wallet key", http.StatusInternalServerError)
		return
	}

	// Return user profile data with DECRYPTED private key
	writeJSON(w, map[string]interface{}{
		"user_id":     userID,
		"wallet_id":   walletID,
		"email":       userRow["email"],
		"full_name":   userRow["full_name"],
		"cnic":        userRow["cnic"],
		"public_key":  base64.StdEncoding.EncodeToString(pubKey),
		"private_key": base64.StdEncoding.EncodeToString(decryptedPrivKey), // Send Raw Key
		"balance":     walletRow["balance"],
	})
}


func transactionHistoryHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet || dbClient == nil {
		http.Error(w, "method not allowed or DB unavailable", http.StatusMethodNotAllowed)
		return
	}

	walletID := r.URL.Query().Get("wallet")
	if walletID == "" {
		http.Error(w, "missing wallet param", http.StatusBadRequest)
		return
	}

	txs, err := dbClient.GetTransactionHistory(context.Background(), walletID, 50)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]interface{}{
		"wallet":       walletID,
		"transactions": txs,
	})
}

type LogsReq struct {
	WalletID string `json:"wallet_id"`
	Action   string `json:"action"`
	Limit    int    `json:"limit"`
}

func logsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || dbClient == nil {
		http.Error(w, "method not allowed or DB unavailable", http.StatusMethodNotAllowed)
		return
	}
	// Simplified logs handler (full implementation would query logs from DB)
	writeJSON(w, map[string]string{"status": "logs endpoint ready"})
}

// Blockchain endpoints

type MineReq struct {
	MinerAddress string `json:"miner_address"`
}

func mineHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var mr MineReq
	if err := json.NewDecoder(r.Body).Decode(&mr); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if mr.MinerAddress == "" {
		http.Error(w, "miner_address required", http.StatusBadRequest)
		return
	}

	block, err := bc.MinePendingTransactions(mr.MinerAddress)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]interface{}{
		"block_index":    block.Index,
		"block_hash":     block.Hash,
		"nonce":          block.Nonce,
		"difficulty":     block.Difficulty,
		"transactions":   block.Transactions,
		"previous_hash":  block.PreviousHash,
		"timestamp":      block.Timestamp,
	})
}

func blocksHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	blocks := bc.GetAllBlocks()
	blockData := make([]map[string]interface{}, 0)
	for _, b := range blocks {
		blockData = append(blockData, map[string]interface{}{
			"index":         b.Index,
			"hash":          b.Hash,
			"nonce":         b.Nonce,
			"difficulty":    b.Difficulty,
			"transactions":  b.Transactions,
			"previous_hash": b.PreviousHash,
			"timestamp":     b.Timestamp,
		})
	}

	writeJSON(w, map[string]interface{}{
		"chain_length": bc.GetChainLength(),
		"blocks":       blockData,
	})
}

func validateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	isValid := bc.ValidateChain()
	writeJSON(w, map[string]interface{}{
		"valid": isValid,
		"chain_length": bc.GetChainLength(),
	})
}

func pendingHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	pending := bc.GetPendingTransactions()
	writeJSON(w, map[string]interface{}{
		"pending_count": len(pending),
		"pending_txs":   pending,
	})
}

// zakatTriggerHandler manually triggers Zakat deduction
func zakatTriggerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if zakatScheduler == nil {
		http.Error(w, "Zakat scheduler not available", http.StatusServiceUnavailable)
		return
	}

	ctx := context.Background()
	err := zakatScheduler.TriggerZakatNow(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]interface{}{
		"status":        "success",
		"message":       "Zakat processing triggered",
		"last_run_time": zakatScheduler.GetLastRunTime(),
	})
}

// zakatPoolBalanceHandler returns the Zakat pool balance
func zakatPoolBalanceHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if zakatScheduler == nil {
		http.Error(w, "Zakat scheduler not available", http.StatusServiceUnavailable)
		return
	}

	if dbClient == nil {
		http.Error(w, "Database not available", http.StatusServiceUnavailable)
		return
	}

	ctx := context.Background()
	balance, err := zakatScheduler.GetZakatPoolBalance(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]interface{}{
		"zakat_pool_wallet": "zakat-pool-system",
		"balance":           balance,
	})
}

// profileGetHandler retrieves user profile by wallet_id
func profileGetHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	walletID := r.URL.Query().Get("wallet_id")
	if walletID == "" {
		http.Error(w, "missing wallet_id param", http.StatusBadRequest)
		return
	}

	profile, err := dbClient.GetUserByWalletID(context.Background(), walletID)
	if err != nil {
		http.Error(w, "profile not found: "+err.Error(), http.StatusNotFound)
		return
	}

	writeJSON(w, profile)
}

// profileUpdateHandler updates user profile (name, email)
// profileUpdateHandler updates user profile (name + security settings, NOT email)
func profileUpdateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if dbClient == nil {
		http.Error(w, "database not available", http.StatusServiceUnavailable)
		return
	}

	var req struct {
		UserID       string `json:"user_id"`
		FullName     string `json:"full_name"`
		ZakatEnabled bool   `json:"zakat_enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := dbClient.UpdateUserNameAndSettings(
		context.Background(), req.UserID, req.FullName, req.ZakatEnabled,
	); err != nil {
		http.Error(w, "failed to update profile: "+err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]interface{}{
		"status":     "updated",
		"user_id":    req.UserID,
		"full_name":  req.FullName,
		"zakat_enabled": req.ZakatEnabled,
	})
}


// beneficiariesListHandler returns beneficiaries for a user
func beneficiariesListHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "missing user_id param", http.StatusBadRequest)
		return
	}

	beneficiaries, err := dbClient.GetBeneficiaries(context.Background(), userID)
	if err != nil {
		http.Error(w, "failed to fetch beneficiaries: "+err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]interface{}{
		"user_id":       userID,
		"beneficiaries": beneficiaries,
	})
}

// beneficiariesAddHandler adds a beneficiary
func beneficiariesAddHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		UserID         string `json:"user_id"`
		WalletID       string `json:"wallet_id"`
		BeneficiaryName string `json:"beneficiary_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := dbClient.AddBeneficiary(context.Background(), req.UserID, req.WalletID, req.BeneficiaryName); err != nil {
		http.Error(w, "failed to add beneficiary: "+err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]interface{}{
		"status":  "added",
		"wallet_id": req.WalletID,
	})
}

// beneficiariesRemoveHandler removes a beneficiary
func beneficiariesRemoveHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		BeneficiaryID string `json:"beneficiary_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if err := dbClient.RemoveBeneficiary(context.Background(), req.BeneficiaryID); err != nil {
		http.Error(w, "failed to remove beneficiary: "+err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]interface{}{
		"status": "removed",
	})
}

type ConfirmEmailChangeReq struct {
	UserID   string `json:"user_id"`
	NewEmail string `json:"new_email"`
	Code     string `json:"code"`
}

func confirmEmailChangeHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || dbClient == nil {
		http.Error(w, "method not allowed or DB unavailable", http.StatusMethodNotAllowed)
		return
	}

	var req ConfirmEmailChangeReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.NewEmail == "" || req.UserID == "" || req.Code == "" {
		http.Error(w, "user_id, new_email and code required", http.StatusBadRequest)
		return
	}

	ok, err := dbClient.VerifyOTP(context.Background(), req.NewEmail, req.Code)
	if err != nil {
		http.Error(w, "failed to verify otp: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if !ok {
		http.Error(w, "invalid or expired otp", http.StatusBadRequest)
		return
	}

	if err := dbClient.UpdateUserEmail(context.Background(), req.UserID, req.NewEmail); err != nil {
		http.Error(w, "failed to update email: "+err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]interface{}{
		"status": "email_updated",
		"user_id": req.UserID,
		"email":   req.NewEmail,
	})
}
