package blockchain

import (
	"testing"
)

func TestBlockMining(t *testing.T) {
	block := &Block{
		Index:        0,
		Timestamp:    1000,
		Transactions: []string{"tx1", "tx2"},
		PreviousHash: "0",
		Nonce:        0,
	}

	block.MineBlock(3)

	// Verify hash starts with 3 zeros
	if block.Hash[:3] != "000" {
		t.Fatalf("block hash should start with 000, got %s", block.Hash[:3])
	}

	// Verify hash is correct
	if block.Hash != block.ComputeHash() {
		t.Fatalf("block hash mismatch after mining")
	}
}

func TestBlockchainCreation(t *testing.T) {
	bc := NewBlockchain(2)

	if bc.GetChainLength() != 1 {
		t.Fatalf("genesis block not created")
	}

	genesis := bc.GetLatestBlock()
	if genesis == nil || genesis.Hash[:2] != "00" {
		t.Fatalf("genesis block invalid")
	}
}

func TestBlockchainAddTransaction(t *testing.T) {
	bc := NewBlockchain(2)
	bc.AddPendingTransaction("tx1")
	bc.AddPendingTransaction("tx2")

	pending := bc.GetPendingTransactions()
	if len(pending) != 2 {
		t.Fatalf("expected 2 pending txs, got %d", len(pending))
	}
}

func TestBlockchainMining(t *testing.T) {
	bc := NewBlockchain(2)
	bc.AddPendingTransaction("tx1")

	block, err := bc.MinePendingTransactions("miner-wallet")
	if err != nil {
		t.Fatalf("mining failed: %v", err)
	}

	if block == nil || block.Index != 1 {
		t.Fatalf("block index should be 1")
	}

	// Pending txs should be cleared
	pending := bc.GetPendingTransactions()
	if len(pending) != 0 {
		t.Fatalf("pending txs should be cleared after mining")
	}

	if bc.GetChainLength() != 2 {
		t.Fatalf("chain should have 2 blocks after mining")
	}
}

func TestBlockchainValidation(t *testing.T) {
	bc := NewBlockchain(2)
	bc.AddPendingTransaction("tx1")
	bc.MinePendingTransactions("miner-wallet")

	if !bc.ValidateChain() {
		t.Fatalf("valid chain failed validation")
	}

	// Tamper with a block and verify validation fails
	blocks := bc.GetAllBlocks()
	if len(blocks) > 1 {
		blocks[1].Transactions = []string{"tampered"}
		if bc.ValidateChain() {
			t.Fatalf("tampered chain should fail validation")
		}
	}
}
