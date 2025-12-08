package crypto

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "encoding/base64"
    "errors"
    "io"
    "os"
)

// getMasterKey reads MASTER_KEY from env (base64 encoded) and returns raw bytes
func getMasterKey() ([]byte, error) {
    k := os.Getenv("MASTER_KEY")
    if k == "" {
        return nil, errors.New("MASTER_KEY not set")
    }
    kb, err := base64.StdEncoding.DecodeString(k)
    if err != nil {
        return nil, err
    }
    if len(kb) != 32 {
        return nil, errors.New("MASTER_KEY must decode to 32 bytes")
    }
    return kb, nil
}

// EncryptPrivateKey encrypts priv bytes with AES-256-GCM and returns base64(ciphertext)
func EncryptPrivateKey(priv []byte) ([]byte, error) {
    key, err := getMasterKey()
    if err != nil {
        return nil, err
    }
    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }
    nonce := make([]byte, gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return nil, err
    }
    ct := gcm.Seal(nil, nonce, priv, nil)
    // prefix nonce
    out := append(nonce, ct...)
    enc := base64.StdEncoding.EncodeToString(out)
    return []byte(enc), nil
}

// DecryptPrivateKey expects base64(nonce|ciphertext) and returns decrypted bytes
func DecryptPrivateKey(enc []byte) ([]byte, error) {
    key, err := getMasterKey()
    if err != nil {
        return nil, err
    }
    data, err := base64.StdEncoding.DecodeString(string(enc))
    if err != nil {
        return nil, err
    }
    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, err
    }
    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, err
    }
    nonceSize := gcm.NonceSize()
    if len(data) < nonceSize {
        return nil, errors.New("ciphertext too short")
    }
    nonce, ct := data[:nonceSize], data[nonceSize:]
    pt, err := gcm.Open(nil, nonce, ct, nil)
    if err != nil {
        return nil, err
    }
    return pt, nil
}
