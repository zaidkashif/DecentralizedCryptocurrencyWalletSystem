package utxo

import (
    "testing"
)

func TestUTXOAddSpendBalance(t *testing.T) {
    m := NewManager()
    owner := "owner-wallet"
    id1 := m.AddUTXO(owner, 100)
    _ = m.AddUTXO(owner, 50)

    bal := m.Balance(owner)
    if bal != 150 {
        t.Fatalf("expected balance 150, got %d", bal)
    }

    if err := m.Spend(id1, owner); err != nil {
        t.Fatalf("spend failed: %v", err)
    }

    bal = m.Balance(owner)
    if bal != 50 {
        t.Fatalf("expected balance 50 after spend, got %d", bal)
    }

    // double-spend should fail
    if err := m.Spend(id1, owner); err == nil {
        t.Fatalf("expected double-spend to fail")
    }
}
