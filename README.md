# CryptoWallet (Demo)

This repository contains a demo blockchain-based wallet application with a Go backend and a React frontend. It is intended for educational/demo purposes and is not production-ready. Password hashing in this demo uses SHA256 for simplicity — replace with bcrypt or Argon2 before any real deployment.

Repository layout

- `backend-go/` — Go HTTP API server, DB access, crypto helpers.
- `frontend/` — React app for wallet UI.
- `tools/` — helper scripts/tools (if present).

Prerequisites

- Go 1.20+ (or compatible)
- Node.js 16+ and npm
- PostgreSQL (or a compatible DB) with schema initialized

Quickstart (development)

1. Backend

   - Create a `.env` file in `backend-go/` (or set environment variables) with the DB connection, e.g.:

     DATABASE_URL=postgres://user:pass@localhost:5432/cryptowallet?sslmode=disable
     PORT=8080

   - Initialize the database schema using the SQL file in `backend-go/db/schema.sql`:

     psql "$DATABASE_URL" -f backend-go/db/schema.sql

   - Run the backend server:

     cd backend-go
     go run ./cmd/server

   Note: some branches include a `cmd/demo` entrypoint used for local testing.

2. Frontend

   - Install dependencies and run the dev server:

     cd frontend
     npm install
     npm start

   - If the frontend needs an API base URL, provide it via `.env` files (e.g. `REACT_APP_API_URL`) or proxy settings.

Security & Production Notes

- Replace demo SHA256 password hashing with a secure algorithm (bcrypt, Argon2).
- Do not store private keys in plaintext. Ensure proper encryption and key management.
- Add HTTPS, rate-limiting, input validation, and other production hardening before deployment.

Where to look next

- Backend server entrypoint: `backend-go/cmd/server` (or `cmd/demo` for local demo runner).
- DB schema: `backend-go/db/schema.sql`.
- Frontend pages: `frontend/src/pages/` (Login, Register, Profile, etc.).

If you want, I can add a Docker dev setup or CI config.

---

Generated on: December 8, 2025
