package db

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"time"

	_ "github.com/lib/pq"
)

// Client wraps Supabase/PostgreSQL connection
type Client struct {
	db *sql.DB
}

// NewClient connects to Supabase PostgreSQL backend
func NewClient(ctx context.Context) (*Client, error) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DATABASE_URL not set")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return nil, err
	}

	if err = db.PingContext(ctx); err != nil {
		return nil, err
	}

	return &Client{db: db}, nil
}

// Close closes the database connection
func (c *Client) Close() error {
	return c.db.Close()
}

// InsertUser inserts a new user
func (c *Client) InsertUser(ctx context.Context, email, fullName, cnic string) (string, error) {
	var userID string
	// zakat_enabled defaults to TRUE in schema
	err := c.db.QueryRowContext(
		ctx,
		"INSERT INTO users (email, full_name, cnic) VALUES ($1, $2, $3) RETURNING id",
		email, fullName, cnic,
	).Scan(&userID)
	return userID, err
}

// InsertWallet inserts a new wallet for a user
func (c *Client) InsertWallet(ctx context.Context, userID, walletID string, pubKey, privKeyEnc []byte) error {
	_, err := c.db.ExecContext(
		ctx,
		"INSERT INTO wallets (user_id, wallet_id, public_key, private_key_encrypted) VALUES ($1, $2, $3, $4)",
		userID, walletID, pubKey, privKeyEnc,
	)
	return err
}

// GetWalletByID retrieves wallet by wallet_id
func (c *Client) GetWalletByID(ctx context.Context, walletID string) (map[string]interface{}, error) {
	row := c.db.QueryRowContext(
		ctx,
		"SELECT id, wallet_id, public_key, balance FROM wallets WHERE wallet_id = $1",
		walletID,
	)
	var id, wid string
	var pubKey []byte
	var balance int64
	err := row.Scan(&id, &wid, &pubKey, &balance)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"id":         id,
		"wallet_id":  wid,
		"public_key": pubKey,
		"balance":    balance,
	}, nil
}

// InsertUTXO inserts a new UTXO
func (c *Client) InsertUTXO(ctx context.Context, utxoID, ownerWalletID string, amount int64) error {
	_, err := c.db.ExecContext(
		ctx,
		"INSERT INTO utxos (utxo_id, owner_wallet_id, amount) VALUES ($1, $2, $3)",
		utxoID, ownerWalletID, amount,
	)
	return err
}

// GetUnspentUTXOs retrieves unspent UTXOs for a wallet
func (c *Client) GetUnspentUTXOs(ctx context.Context, walletID string) ([]map[string]interface{}, error) {
	rows, err := c.db.QueryContext(
		ctx,
		"SELECT utxo_id, amount FROM utxos WHERE owner_wallet_id = $1 AND spent = FALSE",
		walletID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var utxos []map[string]interface{}
	for rows.Next() {
		var utxoID string
		var amount int64
		if err := rows.Scan(&utxoID, &amount); err != nil {
			return nil, err
		}
		utxos = append(utxos, map[string]interface{}{
			"utxo_id": utxoID,
			"amount":  amount,
		})
	}
	return utxos, rows.Err()
}

// GetBalance returns the total balance for a wallet
func (c *Client) GetBalance(ctx context.Context, walletID string) (int64, error) {
	var balance int64
	err := c.db.QueryRowContext(
		ctx,
		"SELECT COALESCE(SUM(amount), 0) FROM utxos WHERE owner_wallet_id = $1 AND spent = FALSE",
		walletID,
	).Scan(&balance)
	return balance, err
}

// GetUTXOByID retrieves a single UTXO by its ID
func (c *Client) GetUTXOByID(ctx context.Context, utxoID string) (map[string]interface{}, error) {
	row := c.db.QueryRowContext(
		ctx,
		"SELECT utxo_id, owner_wallet_id, amount, spent FROM utxos WHERE utxo_id = $1",
		utxoID,
	)
	var id, owner string
	var amount int64
	var spent bool
	err := row.Scan(&id, &owner, &amount, &spent)
	if err != nil {
		return nil, err
	}
	return map[string]interface{}{
		"utxo_id": id,
		"owner":   owner,
		"amount":  amount,
		"spent":   spent,
	}, nil
}

// InsertTransaction inserts a new transaction
func (c *Client) InsertTransaction(ctx context.Context, txID, senderID, receiverID string, amount int64, note string, sig []byte, senderPub []byte, ip string) error {
	// Updates for new schema: sender_public_key, ip_address
	_, err := c.db.ExecContext(
		ctx,
		"INSERT INTO transactions (tx_id, sender_wallet_id, receiver_wallet_id, amount, note, signature, sender_public_key, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
		txID, senderID, receiverID, amount, note, sig, senderPub, ip,
	)
	return err
}

// GetTransactionByID retrieves a single transaction with full details including signature
func (c *Client) GetTransactionByID(ctx context.Context, txID string) (map[string]interface{}, error) {
	row := c.db.QueryRowContext(
		ctx,
		`SELECT tx_id, sender_wallet_id, receiver_wallet_id, amount, note, signature, sender_public_key, tx_type, status, ip_address, created_at 
		 FROM transactions WHERE tx_id = $1`,
		txID,
	)
	var id, senderID, receiverID, txType, status, ipAddr, createdAt string
	var amount int64
	var note *string
	var signature, senderPub []byte
	
	err := row.Scan(&id, &senderID, &receiverID, &amount, &note, &signature, &senderPub, &txType, &status, &ipAddr, &createdAt)
	if err != nil {
		return nil, err
	}
	
	noteVal := ""
	if note != nil {
		noteVal = *note
	}
	
	return map[string]interface{}{
		"tx_id":              id,
		"sender_wallet_id":   senderID,
		"receiver_wallet_id": receiverID,
		"amount":             amount,
		"note":               noteVal,
		"signature":          signature,
		"sender_public_key":  senderPub,
		"tx_type":            txType,
		"status":             status,
		"ip_address":         ipAddr,
		"created_at":         createdAt,
	}, nil
}

// SpendUTXO marks a UTXO as spent
func (c *Client) SpendUTXO(ctx context.Context, utxoID, txID string) error {
	_, err := c.db.ExecContext(
		ctx,
		"UPDATE utxos SET spent = TRUE, spent_in_tx_id = $1, spent_at = NOW() WHERE utxo_id = $2",
		txID, utxoID,
	)
	return err
}

// InsertLog inserts a system log entry
func (c *Client) InsertLog(ctx context.Context, walletID, action, details, status, ipAddress string) error {
	_, err := c.db.ExecContext(
		ctx,
		"INSERT INTO logs (wallet_id, action, details, status, ip_address) VALUES ($1, $2, $3, $4, $5)",
		walletID, action, details, status, ipAddress,
	)
	return err
}

// GetTransactionHistory returns transactions for a wallet
func (c *Client) GetTransactionHistory(ctx context.Context, walletID string, limit int) ([]map[string]interface{}, error) {
	rows, err := c.db.QueryContext(
		ctx,
		`SELECT tx_id, sender_wallet_id, receiver_wallet_id, amount, tx_type, status, created_at 
		 FROM transactions 
		 WHERE sender_wallet_id = $1 OR receiver_wallet_id = $1 
		 ORDER BY created_at DESC LIMIT $2`,
		walletID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var txs []map[string]interface{}
	for rows.Next() {
		var txID, senderID, receiverID, txType, status string
		var amount int64
		var createdAt string
		if err := rows.Scan(&txID, &senderID, &receiverID, &amount, &txType, &status, &createdAt); err != nil {
			return nil, err
		}
		txs = append(txs, map[string]interface{}{
			"tx_id":              txID,
			"sender_wallet_id":   senderID,
			"receiver_wallet_id": receiverID,
			"amount":             amount,
			"tx_type":            txType,
			"status":             status,
			"created_at":         createdAt,
		})
	}
	return txs, rows.Err()
}

// GetAllWallets returns all wallets from the database
func (c *Client) GetAllWallets(ctx context.Context) ([]map[string]interface{}, error) {
	rows, err := c.db.QueryContext(
		ctx,
		`SELECT id, user_id, wallet_id, balance, zakat_last_deducted, created_at 
		 FROM wallets 
		 ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var wallets []map[string]interface{}
	for rows.Next() {
		var id, userID, walletID string
		var balance int64
		var zakatLastDeducted *string
		var createdAt string

		if err := rows.Scan(&id, &userID, &walletID, &balance, &zakatLastDeducted, &createdAt); err != nil {
			return nil, err
		}
		wallets = append(wallets, map[string]interface{}{
			"id":                  id,
			"user_id":             userID,
			"wallet_id":           walletID,
			"balance":             balance,
			"zakat_last_deducted": zakatLastDeducted,
			"created_at":          createdAt,
		})
	}
	return wallets, rows.Err()
}

// InsertBlock stores a mined block in the database
func (c *Client) InsertBlock(ctx context.Context, block interface{}) error {
	// Type assert to blockchain.Block
	b, ok := block.(*struct {
		Index        int64
		Timestamp    int64
		Transactions interface{}
		PreviousHash string
		Hash         string
		Nonce        int64
		Difficulty   int
	})
	if !ok {
		return fmt.Errorf("invalid block type")
	}

	// Updated for new schema: block_index added
	_, err := c.db.ExecContext(
		ctx,
		`INSERT INTO blocks (block_index, block_hash, previous_hash, nonce, difficulty, mined_at) 
		 VALUES ($1, $2, $3, $4, $5, NOW())`,
		b.Index, b.Hash, b.PreviousHash, b.Nonce, b.Difficulty,
	)
	return err
}

// InsertOTP inserts an OTP code for an email
func (c *Client) InsertOTP(ctx context.Context, email, code string, expiresAt time.Time) error {
	// Removed EnsureOTPsTable to rely on Schema
	_, err := c.db.ExecContext(ctx,
		"INSERT INTO otps (email, code, expires_at) VALUES ($1, $2, $3)",
		email, code, expiresAt,
	)
	return err
}

// VerifyOTP checks code for email and marks it used if valid
func (c *Client) VerifyOTP(ctx context.Context, email, code string) (bool, error) {
	// Check code exists, not used, and not expired
	var id int
	err := c.db.QueryRowContext(ctx,
		"SELECT id FROM otps WHERE email=$1 AND code=$2 AND used=FALSE AND expires_at > NOW() LIMIT 1",
		email, code,
	).Scan(&id)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	// mark used
	_, err = c.db.ExecContext(ctx, "UPDATE otps SET used=TRUE WHERE id=$1", id)
	if err != nil {
		return false, err
	}
	return true, nil
}

// GetUserByWalletID retrieves user profile given wallet_id
func (c *Client) GetUserByWalletID(ctx context.Context, walletID string) (map[string]interface{}, error) {
	row := c.db.QueryRowContext(ctx,
		`SELECT u.id, u.email, u.full_name, u.cnic,
		        w.wallet_id, w.public_key, w.created_at, w.zakat_last_deducted,
		        COALESCE(u.zakat_enabled, TRUE)
		 FROM users u
		 JOIN wallets w ON u.id = w.user_id
		 WHERE w.wallet_id = $1`,
		walletID,
	)

	var userID, email, fullName, cnic, wid string
	var pubKey []byte
	var createdAt string
	var zakatLastDeducted *string
	var zakatEnabled bool

	err := row.Scan(&userID, &email, &fullName, &cnic, &wid,
		&pubKey, &createdAt, &zakatLastDeducted, &zakatEnabled)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"user_id":             userID,
		"email":               email,
		"full_name":           fullName,
		"cnic":                cnic,
		"wallet_id":           wid,
		"public_key":          pubKey,
		"created_at":          createdAt,
		"zakat_last_deducted": zakatLastDeducted,
		"zakat_enabled":       zakatEnabled,
	}, nil
}

// UpdateUserProfile updates user name and email
func (c *Client) UpdateUserProfile(ctx context.Context, userID, fullName, email string) error {
	_, err := c.db.ExecContext(ctx,
		"UPDATE users SET full_name=$1, email=$2, updated_at=NOW() WHERE id=$3",
		fullName, email, userID,
	)
	return err
}

// UpdateUserNameAndSettings updates full_name and zakat_enabled
func (c *Client) UpdateUserNameAndSettings(ctx context.Context, userID, fullName string, zakatEnabled bool) error {
	_, err := c.db.ExecContext(ctx,
		"UPDATE users SET full_name=$1, zakat_enabled=$2, updated_at=NOW() WHERE id=$3",
		fullName, zakatEnabled, userID,
	)
	return err
}

// UpdateUserEmail updates only the email (used after OTP verification)
func (c *Client) UpdateUserEmail(ctx context.Context, userID, email string) error {
	_, err := c.db.ExecContext(ctx,
		"UPDATE users SET email=$1, updated_at=NOW() WHERE id=$2",
		email, userID,
	)
	return err
}

// GetBeneficiaries returns all beneficiaries for a user
func (c *Client) GetBeneficiaries(ctx context.Context, userID string) ([]map[string]interface{}, error) {
	rows, err := c.db.QueryContext(ctx,
		"SELECT id, beneficiary_wallet_id, beneficiary_name, created_at FROM beneficiaries WHERE user_id=$1 ORDER BY created_at DESC",
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var beneficiaries []map[string]interface{}
	for rows.Next() {
		var id, wid, name, createdAt string
		if err := rows.Scan(&id, &wid, &name, &createdAt); err != nil {
			return nil, err
		}
		beneficiaries = append(beneficiaries, map[string]interface{}{
			"id":                    id,
			"beneficiary_wallet_id": wid,
			"beneficiary_name":      name,
			"created_at":            createdAt,
		})
	}
	return beneficiaries, rows.Err()
}

// AddBeneficiary adds a beneficiary wallet to user
func (c *Client) AddBeneficiary(ctx context.Context, userID, walletID, name string) error {
	_, err := c.db.ExecContext(ctx,
		"INSERT INTO beneficiaries (user_id, beneficiary_wallet_id, beneficiary_name) VALUES ($1, $2, $3)",
		userID, walletID, name,
	)
	return err
}

// RemoveBeneficiary removes a beneficiary
func (c *Client) RemoveBeneficiary(ctx context.Context, beneficiaryID string) error {
	_, err := c.db.ExecContext(ctx,
		"DELETE FROM beneficiaries WHERE id=$1",
		beneficiaryID,
	)
	return err
}

// UpdateUserPassword updates user's password hash
func (c *Client) UpdateUserPassword(ctx context.Context, userID, passwordHash string) error {
	_, err := c.db.ExecContext(ctx,
		"UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2",
		passwordHash, userID,
	)
	return err
}

// GetUserByEmail retrieves user by email for login
func (c *Client) GetUserByEmail(ctx context.Context, email string) (map[string]interface{}, error) {
	row := c.db.QueryRowContext(ctx,
		"SELECT id, email, full_name, cnic, password_hash FROM users WHERE email=$1",
		email,
	)

	var id, userEmail, fullName, cnic, passwordHash string
	err := row.Scan(&id, &userEmail, &fullName, &cnic, &passwordHash)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"id":            id,
		"email":         userEmail,
		"full_name":     fullName,
		"cnic":          cnic,
		"password_hash": passwordHash,
	}, nil
}

// GetUserWalletByUserID retrieves wallet info for user login
func (c *Client) GetUserWalletByUserID(ctx context.Context, userID string) (map[string]interface{}, error) {
	row := c.db.QueryRowContext(ctx,
		"SELECT id, wallet_id, public_key, private_key_encrypted, balance FROM wallets WHERE user_id=$1",
		userID,
	)

	var id, walletID string
	var pubKey, privKeyEnc []byte
	var balance int64

	err := row.Scan(&id, &walletID, &pubKey, &privKeyEnc, &balance)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"id":                    id,
		"wallet_id":             walletID,
		"public_key":            pubKey,
		"private_key_encrypted": privKeyEnc,
		"balance":               balance,
	}, nil
}