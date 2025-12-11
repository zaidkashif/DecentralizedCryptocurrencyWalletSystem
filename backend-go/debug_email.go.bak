package main

import (
	"fmt"
	"log"
	"net/smtp"
	"os"

	"github.com/joho/godotenv"
)

func main() {
	// 1. Load .env explicitly
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file. Make sure it exists in this folder!")
	}

	from := os.Getenv("SMTP_EMAIL")
	password := os.Getenv("SMTP_PASSWORD")
	toEmail := "f223736@cfd.nu.edu.pk" // <--- REPLACE THIS WITH YOUR EMAIL MANUALLY FOR TESTING

	fmt.Println("--- Email Debug Info ---")
	fmt.Printf("SMTP_EMAIL: '%s'\n", from)
	fmt.Printf("SMTP_PASSWORD Length: %d (Should be 16 for App Passwords)\n", len(password))

	if from == "" || password == "" {
		log.Fatal("❌ Credentials missing in .env")
	}

	// 2. Try Sending
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	msg := []byte("Subject: Test Email\n\nThis is a debug email from your Go Backend.")
	auth := smtp.PlainAuth("", from, password, smtpHost)

	fmt.Println("Attempting to connect to Gmail...")
	err = smtp.SendMail(smtpHost+":"+smtpPort, auth, from, []string{toEmail}, msg)
	if err != nil {
		log.Fatalf("❌ FAILED: %v", err)
	}

	fmt.Println("✅ SUCCESS! Email sent successfully.")
}