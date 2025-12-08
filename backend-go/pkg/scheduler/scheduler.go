package scheduler

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"blockchain-wallet/pkg/blockchain"
	"blockchain-wallet/pkg/db"
	"blockchain-wallet/pkg/tx"
	"blockchain-wallet/pkg/utxo"
)

// ZakatScheduler handles monthly Zakat deductions
type ZakatScheduler struct {
	mu              sync.Mutex
	running         bool
	stopChan        chan struct{}
	db              *db.Client
	bc              *blockchain.Blockchain
	um              *utxo.Manager
	zakatRate       float64 // 2.5% = 0.025
	zakatPoolWallet string  // System wallet address for Zakat pool
	lastRunTime     time.Time
}

// NewZakatScheduler creates a new scheduler instance
func NewZakatScheduler(dbClient *db.Client, bc *blockchain.Blockchain, um *utxo.Manager, zakatPoolWallet string) *ZakatScheduler {
	return &ZakatScheduler{
		db:              dbClient,
		bc:              bc,
		um:              um,
		zakatRate:       0.025, // 2.5%
		zakatPoolWallet: zakatPoolWallet,
		stopChan:        make(chan struct{}),
		lastRunTime:     time.Now(),
	}
}

// Start begins the scheduler in a background goroutine
func (zs *ZakatScheduler) Start(ctx context.Context) {
	zs.mu.Lock()
	if zs.running {
		zs.mu.Unlock()
		return
	}
	zs.running = true
	zs.mu.Unlock()

	go zs.run(ctx)
	log.Println("✓ Zakat Scheduler started")
}

// Stop gracefully stops the scheduler
func (zs *ZakatScheduler) Stop() {
	zs.mu.Lock()
	if !zs.running {
		zs.mu.Unlock()
		return
	}
	zs.running = false
	zs.mu.Unlock()

	close(zs.stopChan)
	log.Println("Zakat Scheduler stopped")
}

// run executes the scheduler loop (checks monthly)
func (zs *ZakatScheduler) run(ctx context.Context) {
	// Check every hour if a month has passed
	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-zs.stopChan:
			return
		case <-ticker.C:
			// Check if a month has passed since last run
			if time.Since(zs.lastRunTime) >= 30*24*time.Hour {
				zs.processMonthlyZakat(ctx)
				zs.lastRunTime = time.Now()
			}
		}
	}
}

// processMonthlyZakat handles the monthly Zakat deduction for all wallets
func (zs *ZakatScheduler) processMonthlyZakat(ctx context.Context) {
	log.Println("⏰ Processing monthly Zakat deductions...")

	// If no database, skip processing
	if zs.db == nil {
		log.Println("  No database available, skipping Zakat processing")
		return
	}

	// Get all wallets from database
	wallets, err := zs.db.GetAllWallets(ctx)
	if err != nil {
		log.Printf("Error fetching wallets: %v", err)
		return
	}

	zakatTxIDs := []string{}
	totalZakat := int64(0)

	for _, wallet := range wallets {
		// Skip system wallet (Zakat pool)
		if wallet["wallet_id"] == zs.zakatPoolWallet {
			continue
		}

		balance, ok := wallet["balance"].(int64)
		if !ok {
			continue
		}

		// Calculate 2.5% Zakat
		zakatAmount := int64(float64(balance) * zs.zakatRate)
		if zakatAmount == 0 {
			continue
		}

		walletID, ok := wallet["wallet_id"].(string)
		if !ok {
			continue
		}

		// Create Zakat transaction
		zakatTx := &tx.Transaction{
			SenderID:    walletID,
			ReceiverID:  zs.zakatPoolWallet,
			Amount:      zakatAmount,
			Timestamp:   time.Now().Unix(),
			Note:        "Monthly Zakat deduction (2.5%)",
		}

		// Compute transaction ID
		zakatTx.ComputeID()

		zakatTxIDs = append(zakatTxIDs, zakatTx.ID)
		totalZakat += zakatAmount

		// Log Zakat deduction
		_ = zs.db.InsertLog(ctx, walletID, "zakat_deducted", fmt.Sprintf("Deducted %d coins as Zakat", zakatAmount), "success", "system")

		log.Printf("  → Deducted %d coins from wallet %s (2.5%% = %.2f%%)", zakatAmount, walletID[:16], zs.zakatRate*100)
	}

	if len(zakatTxIDs) == 0 {
		log.Println("  No wallets eligible for Zakat this month")
		return
	}

	// Add Zakat transactions to pending pool
	for _, txID := range zakatTxIDs {
		zs.bc.AddPendingTransaction(txID)
	}

	log.Printf("  Total Zakat collected: %d coins from %d wallets", totalZakat, len(zakatTxIDs))

	// Mine a block to confirm Zakat transactions
	block, err := zs.bc.MinePendingTransactions(zs.zakatPoolWallet)
	if err != nil {
		log.Printf("Error mining Zakat block: %v", err)
		return
	}
	if block != nil {
		log.Printf("  ✓ Zakat block mined: %s", block.Hash[:16])

		// Store block in database
		err := zs.db.InsertBlock(ctx, block)
		if err != nil {
			log.Printf("Error storing Zakat block: %v", err)
		}

		// Log block creation
		_ = zs.db.InsertLog(ctx, zs.zakatPoolWallet, "zakat_block_mined",
			fmt.Sprintf("Mined Zakat block with %d transactions", len(zakatTxIDs)),
			"success", "system")
	}

	log.Println("✓ Monthly Zakat processing complete")
}

// TriggerZakatNow forces an immediate Zakat calculation (for testing)
func (zs *ZakatScheduler) TriggerZakatNow(ctx context.Context) error {
	zs.processMonthlyZakat(ctx)
	zs.lastRunTime = time.Now()
	return nil
}

// GetLastRunTime returns the timestamp of the last Zakat run
func (zs *ZakatScheduler) GetLastRunTime() time.Time {
	zs.mu.Lock()
	defer zs.mu.Unlock()
	return zs.lastRunTime
}

// GetZakatPoolBalance returns the balance of the Zakat pool wallet
func (zs *ZakatScheduler) GetZakatPoolBalance(ctx context.Context) (int64, error) {
	return zs.db.GetBalance(ctx, zs.zakatPoolWallet)
}
