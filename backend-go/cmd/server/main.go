package main

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"time"

	"github.com/joho/godotenv"

	"blockchain-wallet/pkg/blockchain"
	"blockchain-wallet/pkg/crypto"
	"blockchain-wallet/pkg/db"
	"blockchain-wallet/pkg/scheduler"
	"blockchain-wallet/pkg/tx"
	"blockchain-wallet/pkg/utxo"
)

var utxoMgr = utxo.NewManager()
var dbClient *db.Client
var bc *blockchain.Blockchain
var zakatScheduler *scheduler.ZakatScheduler

func init() {
	// Load .env file
	_ = godotenv.Load()

	var err error
	dbClient, err = db.NewClient(context.Background())
	if err != nil {
		log.Printf("Warning: DB connection failed: %v. Using in-memory UTXO only.", err)
		dbClient = nil
	} else {
		log.Printf("✓ Database connected successfully")
	}
	// Initialize blockchain with difficulty 5 (starts with "00000")
	bc = blockchain.NewBlockchain(5)

	// Initialize Zakat scheduler
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

	// Start Zakat scheduler if DB is connected
	if dbClient != nil {
		ctx := context.Background()
		zakatScheduler.Start(ctx)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	mux.HandleFunc("/wallet/create", createWalletHandler)
	mux.HandleFunc("/wallet/fund", fundHandler)
	mux.HandleFunc("/wallet/balance", balanceHandler)
	mux.HandleFunc("/tx/submit", txSubmitHandler)

	// Auth endpoints (registered when DB available below)

	// Blockchain endpoints
	mux.HandleFunc("/blockchain/mine", mineHandler)
	mux.HandleFunc("/blockchain/blocks", blocksHandler)
	mux.HandleFunc("/blockchain/validate", validateHandler)
	mux.HandleFunc("/blockchain/pending", pendingHandler)

	// Zakat endpoints (if scheduler available)
	if zakatScheduler != nil {
		mux.HandleFunc("/zakat/trigger", zakatTriggerHandler)
		mux.HandleFunc("/zakat/pool-balance", zakatPoolBalanceHandler)
	}

	// DB endpoints (if available)
	if dbClient != nil {
		mux.HandleFunc("/auth/signup", signupHandler)
		mux.HandleFunc("/auth/verify-otp", verifyOtpHandler)
		mux.HandleFunc("/auth/login", loginHandler)
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

	addr := ":8080"
	log.Printf("server listening on %s", addr)
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
	if dbClient != nil {
		var err error
		bal, err = dbClient.GetBalance(context.Background(), wallet)
		if err != nil {
			log.Printf("Warning: failed to get balance from DB: %v", err)
			bal = utxoMgr.Balance(wallet)
		}
	} else {
		bal = utxoMgr.Balance(wallet)
	}

	writeJSON(w, map[string]interface{}{"wallet": wallet, "balance": bal})
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
		if err := dbClient.InsertTransaction(context.Background(), txx.ID, txx.SenderID, txx.ReceiverID, txx.Amount, txx.Note, txx.Signature); err != nil {
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

func signupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost || dbClient == nil {
		http.Error(w, "method not allowed or DB unavailable", http.StatusMethodNotAllowed)
		return
	}

	var sr SignupReq
	if err := json.NewDecoder(r.Body).Decode(&sr); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Generate 6-digit OTP
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

	// NOTE: For development/demo we return the OTP in the response. In production, send via email.
	log.Printf("OTP for %s = %s (expires %s)", sr.Email, code, expiresAt.Format(time.RFC3339))
	writeJSON(w, map[string]interface{}{
		"status": "otp_sent",
		"email":  sr.Email,
		"otp":    code,
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

	// Get encrypted private key
	privKeyEnc := walletRow["private_key_encrypted"].([]byte)
	pubKey := walletRow["public_key"].([]byte)
	walletID := walletRow["wallet_id"].(string)

	// Return user profile data
	writeJSON(w, map[string]interface{}{
		"user_id":               userID,
		"wallet_id":             walletID,
		"email":                 userRow["email"],
		"full_name":             userRow["full_name"],
		"cnic":                  userRow["cnic"],
		"public_key":            base64.StdEncoding.EncodeToString(pubKey),
		"private_key_encrypted": base64.StdEncoding.EncodeToString(privKeyEnc),
		"balance":               walletRow["balance"],
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
