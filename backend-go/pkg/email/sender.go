package email

import (
	"fmt"
	"net/smtp"
	"os"
)

// SendOTP sends the 6-digit code to the user via Gmail
func SendOTP(toEmail, code string) error {
	// 1. Get Credentials from .env (Same as debug script)
	from := os.Getenv("SMTP_EMAIL")
	password := os.Getenv("SMTP_PASSWORD")
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	if from == "" || password == "" {
		return fmt.Errorf("SMTP credentials not set in .env")
	}

	// 2. Format the Email Message
	subject := "Subject: Your CryptoWallet Verification Code\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	body := fmt.Sprintf(`
		<html>
			<body style="font-family: Arial, sans-serif; color: #333;">
				<div style="max-width: 400px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
					<h2 style="color: #2563EB;">Verification Code</h2>
					<p>Your OTP code is:</p>
					<h1 style="background: #f3f4f6; padding: 10px; text-align: center; letter-spacing: 5px;">%s</h1>
					<p>This code expires in 10 minutes.</p>
				</div>
			</body>
		</html>`, code)

	msg := []byte(subject + mime + body)

	// 3. Authenticate & Send
	auth := smtp.PlainAuth("", from, password, smtpHost)
	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, from, []string{toEmail}, msg)
	if err != nil {
		return err
	}
	return nil
}