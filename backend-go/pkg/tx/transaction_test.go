package tx

import (
    "testing"
    "blockchain-wallet/backend/pkg/crypto"
    "blockchain-wallet/backend/pkg/utxo"
)

func TestTransactionSignAndUTXOFlow(t *testing.T) {
    // Initialize keys
    priv, pub, err := crypto.GenerateKeypair()
    if err != nil {
        t.Fatalf("key gen: %v", err)
    }
    senderID := crypto.WalletIDFromPub(pub)

    // receiver
    _, rpub, err := crypto.GenerateKeypair()
    if err != nil {
        t.Fatalf("key gen receiver: %v", err)
    }
    receiverID := crypto.WalletIDFromPub(rpub)

    // UTXO manager and funding
    m := utxo.NewManager()
    u1 := m.AddUTXO(senderID, 70)
    _ = m.AddUTXO(senderID, 40)

    // create tx spending u1 (70)
    txx := NewTransaction(senderID, receiverID, 70, "payment", []string{u1})
    payload := txx.Payload()
    sig := crypto.SignPayload(priv, payload)
    txx.Signature = sig
    txx.SenderPub = pub

    // verify signature
    ok := crypto.VerifySignature(pub, payload, sig)
    if !ok {
        t.Fatalf("signature should verify")
    }

    // Spend UTXO and check balances
    err = m.Spend(u1, senderID)
    if err != nil {
        t.Fatalf("spend failed: %v", err)
    }
    bal := m.Balance(senderID)
    if bal != 40 {
        t.Fatalf("expected balance 40, got %d", bal)
    }

    // Attempt to spend same UTXO via new tx should fail
    if err := m.Spend(u1, senderID); err == nil {
        t.Fatalf("double-spend allowed")
    }
}
