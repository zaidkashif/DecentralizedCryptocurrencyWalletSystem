package main

import (
	"fmt"
	"log"
	"time"

	"blockchain-wallet/backend/pkg/blockchain"
	"blockchain-wallet/backend/pkg/tx"
	"blockchain-wallet/backend/pkg/utxo"
)

func main() {
	fmt.Println("=== Blockchain Demo ===")

	// Create blockchain
	bc := blockchain.NewBlockchain(3) // difficulty = 3 (hash starts with "000")
	fmt.Printf("Genesis block created (hash: %s)\n\n", bc.GetLatestBlock().Hash[:10]+"...")

	// Add transactions
	bc.AddPendingTransaction("tx1")
	bc.AddPendingTransaction("tx2")
	fmt.Printf("Added 2 pending transactions\n")
	fmt.Printf("Pending count: %d\n\n", len(bc.GetPendingTransactions()))

	// Mine block 1
	fmt.Println("Mining block 1...")
	start := time.Now()
	block1, err := bc.MinePendingTransactions("miner-wallet-1")
	elapsed := time.Since(start)
	if err != nil {
		log.Fatalf("Mining failed: %v", err)
	}
	fmt.Printf("✓ Block 1 mined in %v (nonce: %d, hash: %s)\n\n", elapsed, block1.Nonce, block1.Hash[:10]+"...")

	// Validate chain
	isValid := bc.ValidateChain()
	fmt.Printf("Chain valid: %v\n", isValid)
	fmt.Printf("Chain length: %d\n\n", bc.GetChainLength())

	// Add more transactions
	bc.AddPendingTransaction("tx3")
	bc.AddPendingTransaction("tx4")
	fmt.Printf("Added 2 more pending transactions\n")
	fmt.Printf("Pending count: %d\n\n", len(bc.GetPendingTransactions()))

	// Mine block 2
	fmt.Println("Mining block 2...")
	start = time.Now()
	block2, err := bc.MinePendingTransactions("miner-wallet-2")
	elapsed = time.Since(start)
	if err != nil {
		log.Fatalf("Mining failed: %v", err)
	}
	fmt.Printf("✓ Block 2 mined in %v (nonce: %d, hash: %s)\n\n", elapsed, block2.Nonce, block2.Hash[:10]+"...")

	// Validate again
	isValid = bc.ValidateChain()
	fmt.Printf("Chain valid after block 2: %v\n", isValid)
	fmt.Printf("Final chain length: %d\n\n", bc.GetChainLength())

	// Demonstrate UTXO + tx signing
	fmt.Println("=== UTXO + Transaction Demo ===")
	m := utxo.NewManager()
	u1 := m.AddUTXO("wallet-a", 100)
	_ = m.AddUTXO("wallet-a", 50)
	fmt.Printf("Added UTXOs to wallet-a (total balance: %d)\n", m.Balance("wallet-a"))

	// Create transaction
	txx := tx.NewTransaction("wallet-a", "wallet-b", 70, "payment", []string{u1})
	fmt.Printf("Created transaction: %s\n", txx.ID[:10]+"...")

	// Spend UTXO
	err = m.Spend(u1, "wallet-a")
	if err != nil {
		log.Fatalf("Failed to spend UTXO: %v", err)
	}
	fmt.Printf("Spent UTXO, remaining balance in wallet-a: %d\n", m.Balance("wallet-a"))

	// Try double-spend (should fail)
	err = m.Spend(u1, "wallet-a")
	if err != nil {
		fmt.Printf("✓ Double-spend prevented: %v\n", err)
	}

	fmt.Println("\n✓ Demo completed successfully!")
}
