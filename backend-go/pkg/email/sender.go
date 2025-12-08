package email

import (
	"fmt"
	"net/smtp"
	"os"
)

// SendOTP sends the 6-digit code to the user via Gmail
func SendOTP(toEmail, code string) error {
	from := os.Getenv("SMTP_EMAIL")
	password := os.Getenv("SMTP_PASSWORD")
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	if from == "" || password == "" {
		return fmt.Errorf("SMTP credentials not set in .env")
	}

	// Message content
	subject := "Subject: Your CryptoWallet OTP Code\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	body := fmt.Sprintf(`
		<html>
			<body>
				<h2>Verification Code</h2>
				<p>Your OTP code is: <strong>%s</strong></p>
				<p>This code expires in 10 minutes.</p>
			</body>
		</html>`, code)

	msg := []byte(subject + mime + body)

	// Authentication
	auth := smtp.PlainAuth("", from, password, smtpHost)

	// Send email
	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, from, []string{toEmail}, msg)
	if err != nil {
		return err
	}
	return nil
}