package crypto

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

// HashPassword creates a simple SHA256 hash of the password with salt
// For production, use bcrypt instead: "golang.org/x/crypto/bcrypt"
func HashPassword(password string) string {
	// Use a simple SHA256 hash (not production-grade, but works for demo)
	hash := sha256.Sum256([]byte(password + "blockchain-wallet-salt"))
	return hex.EncodeToString(hash[:])
}

// VerifyPassword checks if provided password matches the hash
func VerifyPassword(password, hash string) bool {
	return HashPassword(password) == hash
}

// ValidatePassword checks password strength (at least 8 chars, alphanumeric)
func ValidatePassword(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("password must be at least 8 characters long")
	}
	
	hasLetter := false
	hasDigit := false
	
	for _, char := range password {
		if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') {
			hasLetter = true
		}
		if char >= '0' && char <= '9' {
			hasDigit = true
		}
	}
	
	if !hasLetter || !hasDigit {
		return fmt.Errorf("password must contain both letters and numbers")
	}
	
	return nil
}
