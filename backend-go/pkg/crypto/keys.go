package crypto

import (
    "crypto/ed25519"
    "crypto/rand"
    "crypto/sha256"
    "encoding/hex"
)

// GenerateKeypair returns an Ed25519 private and public key.
func GenerateKeypair() (ed25519.PrivateKey, ed25519.PublicKey, error) {
    pub, priv, err := ed25519.GenerateKey(rand.Reader)
    if err != nil {
        return nil, nil, err
    }
    return priv, pub, nil
}

// WalletIDFromPub computes a wallet ID by SHA-256 hashing the public key and returning hex.
func WalletIDFromPub(pub ed25519.PublicKey) string {
    h := sha256.Sum256(pub)
    return hex.EncodeToString(h[:])
}

// SignPayload signs the given payload with the private key.
func SignPayload(priv ed25519.PrivateKey, payload []byte) []byte {
    sig := ed25519.Sign(priv, payload)
    return sig
}

// VerifySignature verifies a signature over payload using the public key.
func VerifySignature(pub ed25519.PublicKey, payload, sig []byte) bool {
    return ed25519.Verify(pub, payload, sig)
}
