package crypto

import (
    "testing"
)

func TestKeypairAndWalletID(t *testing.T) {
    priv, pub, err := GenerateKeypair()
    if err != nil {
        t.Fatalf("GenerateKeypair error: %v", err)
    }
    if len(pub) == 0 || len(priv) == 0 {
        t.Fatalf("empty keys")
    }
    id := WalletIDFromPub(pub)
    if len(id) == 0 {
        t.Fatalf("empty wallet id")
    }

    payload := []byte("hello")
    sig := SignPayload(priv, payload)
    if !VerifySignature(pub, payload, sig) {
        t.Fatalf("signature verification failed")
    }
}
