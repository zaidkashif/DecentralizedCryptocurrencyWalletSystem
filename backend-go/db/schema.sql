-- Supabase SQL Schema for Blockchain Wallet System
-- Run these migrations in Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    cnic VARCHAR(50),
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id VARCHAR(255) UNIQUE NOT NULL,
    public_key BYTEA NOT NULL,
    private_key_encrypted BYTEA NOT NULL,
    balance INT8 DEFAULT 0,
    zakat_last_deducted TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- UTXOs table
CREATE TABLE IF NOT EXISTS utxos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utxo_id VARCHAR(255) UNIQUE NOT NULL,
    owner_wallet_id VARCHAR(255) NOT NULL,
    amount INT8 NOT NULL,
    spent BOOLEAN DEFAULT FALSE,
    spent_in_tx_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    spent_at TIMESTAMP,
    FOREIGN KEY (owner_wallet_id) REFERENCES wallets(wallet_id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_id VARCHAR(255) UNIQUE NOT NULL,
    sender_wallet_id VARCHAR(255) NOT NULL,
    receiver_wallet_id VARCHAR(255) NOT NULL,
    amount INT8 NOT NULL,
    note TEXT,
    tx_type VARCHAR(50) DEFAULT 'transfer',
    signature BYTEA NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP,
    block_hash VARCHAR(255),
    FOREIGN KEY (sender_wallet_id) REFERENCES wallets(wallet_id),
    FOREIGN KEY (receiver_wallet_id) REFERENCES wallets(wallet_id)
);

-- Blocks table
CREATE TABLE IF NOT EXISTS blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_hash VARCHAR(255) UNIQUE NOT NULL,
    previous_hash VARCHAR(255),
    nonce INT8,
    difficulty INT DEFAULT 5,
    mined_at TIMESTAMP DEFAULT NOW(),
    miner_wallet_id VARCHAR(255) REFERENCES wallets(wallet_id)
);

-- Block transactions (many-to-many)
CREATE TABLE IF NOT EXISTS block_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    tx_id VARCHAR(255) NOT NULL REFERENCES transactions(tx_id),
    UNIQUE(block_id, tx_id)
);

-- System logs table
CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    status VARCHAR(50),
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (wallet_id) REFERENCES wallets(wallet_id)
);

-- Beneficiaries table
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
