package blockchain

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"sync"
	"time"
)

// Block represents a blockchain block
type Block struct {
	Index        int64
	Timestamp    int64
	Transactions []string // transaction IDs
	PreviousHash string
	Hash         string
	Nonce        int64
	Difficulty   int
}

// ComputeHash computes SHA-256 hash of the block
func (b *Block) ComputeHash() string {
	blockData := fmt.Sprintf("%d%d%s%s%d%d", b.Index, b.Timestamp, b.Transactions, b.PreviousHash, b.Nonce, b.Difficulty)
	hash := sha256.Sum256([]byte(blockData))
	return hex.EncodeToString(hash[:])
}

// MineBlock performs Proof-of-Work mining (finds nonce where hash starts with required zeros)
func (b *Block) MineBlock(difficulty int) {
	b.Difficulty = difficulty
	requiredPrefix := ""
	for i := 0; i < difficulty; i++ {
		requiredPrefix += "0"
	}

	for b.Hash == "" || b.Hash[:difficulty] != requiredPrefix {
		b.Nonce++
		b.Hash = b.ComputeHash()
	}
}

// Blockchain manages the chain of blocks
type Blockchain struct {
	mu            sync.RWMutex
	chain         []*Block
	difficulty    int
	pendingTxs    []string
	miningReward  int64
}

// NewBlockchain creates a new blockchain with genesis block
func NewBlockchain(difficulty int) *Blockchain {
	bc := &Blockchain{
		chain:        make([]*Block, 0),
		difficulty:   difficulty,
		pendingTxs:   make([]string, 0),
		miningReward: 10,
	}
	// Create genesis block
	genesisBlock := &Block{
		Index:        0,
		Timestamp:    time.Now().Unix(),
		Transactions: []string{},
		PreviousHash: "0",
		Hash:         "",
		Nonce:        0,
	}
	genesisBlock.MineBlock(difficulty)
	bc.chain = append(bc.chain, genesisBlock)
	return bc
}

// AddPendingTransaction adds a transaction ID to pending pool
func (bc *Blockchain) AddPendingTransaction(txID string) {
	bc.mu.Lock()
	defer bc.mu.Unlock()
	bc.pendingTxs = append(bc.pendingTxs, txID)
}

// GetPendingTransactions returns pending transaction IDs (clears pool after mining)
func (bc *Blockchain) GetPendingTransactions() []string {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	txs := make([]string, len(bc.pendingTxs))
	copy(txs, bc.pendingTxs)
	return txs
}

// MinePendingTransactions mines pending transactions into a new block
func (bc *Blockchain) MinePendingTransactions(minerAddress string) (*Block, error) {
	bc.mu.Lock()
	defer bc.mu.Unlock()

	lastBlock := bc.chain[len(bc.chain)-1]
	newBlock := &Block{
		Index:        int64(len(bc.chain)),
		Timestamp:    time.Now().Unix(),
		Transactions: append(bc.pendingTxs, "MINING_REWARD:"+minerAddress), // add mining reward tx
		PreviousHash: lastBlock.Hash,
		Hash:         "",
		Nonce:        0,
	}

	// Mine the block
	newBlock.MineBlock(bc.difficulty)

	// Add to chain
	bc.chain = append(bc.chain, newBlock)

	// Clear pending transactions
	bc.pendingTxs = make([]string, 0)

	return newBlock, nil
}

// ValidateChain checks blockchain integrity
func (bc *Blockchain) ValidateChain() bool {
	bc.mu.RLock()
	defer bc.mu.RUnlock()

	for i := 1; i < len(bc.chain); i++ {
		currentBlock := bc.chain[i]
		previousBlock := bc.chain[i-1]

		// Verify current block hash
		if currentBlock.Hash != currentBlock.ComputeHash() {
			return false
		}

		// Verify previous hash link
		if currentBlock.PreviousHash != previousBlock.Hash {
			return false
		}

		// Verify PoW (hash should start with difficulty zeros)
		requiredPrefix := ""
		for j := 0; j < currentBlock.Difficulty; j++ {
			requiredPrefix += "0"
		}
		if currentBlock.Hash[:currentBlock.Difficulty] != requiredPrefix {
			return false
		}
	}

	return true
}

// GetBlockByIndex returns a block at given index
func (bc *Blockchain) GetBlockByIndex(index int64) *Block {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	if index < 0 || index >= int64(len(bc.chain)) {
		return nil
	}
	return bc.chain[int(index)]
}

// GetLatestBlock returns the last block in the chain
func (bc *Blockchain) GetLatestBlock() *Block {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	if len(bc.chain) == 0 {
		return nil
	}
	return bc.chain[len(bc.chain)-1]
}

// GetChainLength returns the number of blocks
func (bc *Blockchain) GetChainLength() int {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	return len(bc.chain)
}

// GetAllBlocks returns all blocks
func (bc *Blockchain) GetAllBlocks() []*Block {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	blocks := make([]*Block, len(bc.chain))
	copy(blocks, bc.chain)
	return blocks
}

// AdjustDifficulty adjusts mining difficulty based on block time
func (bc *Blockchain) AdjustDifficulty(targetBlockTime int64) {
	bc.mu.Lock()
	defer bc.mu.Unlock()

	if len(bc.chain) < 10 {
		return // Not enough blocks to adjust
	}

	// Calculate average block time over last 10 blocks
	lastBlock := bc.chain[len(bc.chain)-1]
	tenBlocksAgo := bc.chain[len(bc.chain)-11]
	avgTime := (lastBlock.Timestamp - tenBlocksAgo.Timestamp) / 10

	if avgTime < targetBlockTime {
		bc.difficulty++
	} else if avgTime > targetBlockTime && bc.difficulty > 1 {
		bc.difficulty--
	}
}
