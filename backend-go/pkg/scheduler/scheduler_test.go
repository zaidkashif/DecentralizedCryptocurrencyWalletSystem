package scheduler

import (
	"context"
	"testing"
	"time"

	"blockchain-wallet/pkg/blockchain"
	"blockchain-wallet/pkg/utxo"
)

// TestZakatSchedulerInit tests scheduler initialization
func TestZakatSchedulerInit(t *testing.T) {
	bc := blockchain.NewBlockchain(5)
	um := utxo.NewManager()
	zs := NewZakatScheduler(nil, bc, um, "zakat-pool")

	if zs == nil {
		t.Fatal("Failed to create scheduler")
	}

	if zs.zakatRate != 0.025 {
		t.Errorf("Expected Zakat rate 0.025, got %f", zs.zakatRate)
	}

	if zs.zakatPoolWallet != "zakat-pool" {
		t.Errorf("Expected pool wallet 'zakat-pool', got %s", zs.zakatPoolWallet)
	}
}

// TestTriggerZakatNow tests immediate Zakat triggering
func TestTriggerZakatNow(t *testing.T) {
	bc := blockchain.NewBlockchain(5)
	um := utxo.NewManager()
	zs := NewZakatScheduler(nil, bc, um, "zakat-pool")

	ctx := context.Background()
	before := zs.GetLastRunTime()

	// Wait a tiny bit
	time.Sleep(10 * time.Millisecond)

	// Trigger
	err := zs.TriggerZakatNow(ctx)
	if err != nil {
		t.Fatalf("TriggerZakatNow failed: %v", err)
	}

	after := zs.GetLastRunTime()
	if after.Before(before) {
		t.Error("Last run time was not updated")
	}
}

// TestZakatStartStop tests scheduler start/stop lifecycle
func TestZakatStartStop(t *testing.T) {
	bc := blockchain.NewBlockchain(5)
	um := utxo.NewManager()
	zs := NewZakatScheduler(nil, bc, um, "zakat-pool")

	ctx := context.Background()

	// Start scheduler
	zs.Start(ctx)
	time.Sleep(100 * time.Millisecond)

	// Stop scheduler
	zs.Stop()
	time.Sleep(100 * time.Millisecond)

	// Verify stopped
	zs.mu.Lock()
	if zs.running {
		t.Error("Scheduler should be stopped")
	}
	zs.mu.Unlock()
}
