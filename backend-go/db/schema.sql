-- Supabase SQL Schema for Blockchain Wallet System
-- COMPLIANT WITH FINAL PROJECT REQUIREMENTS

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    cnic VARCHAR(50),
    password_hash VARCHAR(255),
    zakat_enabled BOOLEAN DEFAULT TRUE, -- For Profile Management settings
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. OTPs table (Missing in previous schema, required for Req 3.1)
CREATE TABLE IF NOT EXISTS otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id VARCHAR(255) UNIQUE NOT NULL, -- Hashed Public Key (Req 3.2)
    public_key BYTEA NOT NULL,
    private_key_encrypted BYTEA NOT NULL, -- AES/RSA Encrypted (Req 3.1)
    balance INT8 DEFAULT 0, -- Cached balance (Req 3.2)
    zakat_last_deducted TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 4. UTXOs table
CREATE TABLE IF NOT EXISTS utxos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utxo_id VARCHAR(255) UNIQUE NOT NULL,
    owner_wallet_id VARCHAR(255) NOT NULL,
    amount INT8 NOT NULL,
    spent BOOLEAN DEFAULT FALSE, -- Double-spend prevention (Req 3.5)
    spent_in_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    spent_at TIMESTAMP,
    FOREIGN KEY (owner_wallet_id) REFERENCES wallets(wallet_id)
);

-- 5. Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_id VARCHAR(255) UNIQUE NOT NULL,
    sender_wallet_id VARCHAR(255) NOT NULL,
    receiver_wallet_id VARCHAR(255) NOT NULL,
    amount INT8 NOT NULL,
    note TEXT,
    tx_type VARCHAR(50) DEFAULT 'transfer', -- 'transfer', 'mining_reward', 'zakat_deduction'
    sender_public_key BYTEA, -- STRICT REQUIREMENT 3.5 (Must be in transaction)
    signature BYTEA NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'mined', 'failed'
    block_hash VARCHAR(255), -- Link to block when mined
    ip_address VARCHAR(50), -- STRICT REQUIREMENT 3.7 (Transaction Logs must store IP)
    created_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP,
    FOREIGN KEY (sender_wallet_id) REFERENCES wallets(wallet_id),
    FOREIGN KEY (receiver_wallet_id) REFERENCES wallets(wallet_id)
);

-- 6. Blocks table
CREATE TABLE IF NOT EXISTS blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_index INT8 NOT NULL, -- STRICT REQUIREMENT 3.4 (Index field)
    block_hash VARCHAR(255) UNIQUE NOT NULL,
    previous_hash VARCHAR(255) NOT NULL,
    merkle_root VARCHAR(255), -- STRICT REQUIREMENT 3.4 (Optional/Bonus)
    nonce INT8 NOT NULL,
    difficulty INT DEFAULT 5, -- Adjustable difficulty (Req 3.4)
    mined_at TIMESTAMP DEFAULT NOW(),
    miner_wallet_id VARCHAR(255) REFERENCES wallets(wallet_id)
);

-- 7. Block transactions (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS block_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    tx_id VARCHAR(255) NOT NULL REFERENCES transactions(tx_id),
    UNIQUE(block_id, tx_id)
);

-- 8. System logs table (Req 3.7)
CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id VARCHAR(255),
    action VARCHAR(100) NOT NULL, -- 'login', 'failed_otp', 'mining_event', 'zakat'
    details TEXT,
    status VARCHAR(50),
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (wallet_id) REFERENCES wallets(wallet_id)
);

-- 9. Beneficiaries table
CREATE TABLE IF NOT EXISTS beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    beneficiary_wallet_id VARCHAR(255) NOT NULL,
    beneficiary_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, beneficiary_wallet_id)
);

-- Indexes for performance
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_wallet_id ON wallets(wallet_id);
CREATE INDEX idx_utxos_owner ON utxos(owner_wallet_id);
CREATE INDEX idx_utxos_spent ON utxos(spent);
CREATE INDEX idx_transactions_sender ON transactions(sender_wallet_id);
CREATE INDEX idx_transactions_receiver ON transactions(receiver_wallet_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_logs_wallet ON logs(wallet_id);
CREATE INDEX idx_blocks_hash ON blocks(block_hash);
CREATE INDEX idx_blocks_index ON blocks(block_index); -- Important for blockchain sync