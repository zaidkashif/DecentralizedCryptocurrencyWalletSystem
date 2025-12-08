package tx

import (
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "time"
)

// Transaction represents a UTXO-style transaction
type Transaction struct {
    ID          string
    SenderID    string
    ReceiverID  string
    Amount      int64
    Timestamp   int64
    Note        string
    SenderPub   []byte
    Signature   []byte
    InputUTXOs  []string // IDs of UTXOs being spent
}

// Payload returns the byte payload that should be signed: sender+receiver+amount+timestamp+note
func (t *Transaction) Payload() []byte {
    s := fmt.Sprintf("%s|%s|%d|%d|%s", t.SenderID, t.ReceiverID, t.Amount, t.Timestamp, t.Note)
    return []byte(s)
}

// ComputeID computes a deterministic ID for the transaction from its payload and inputs
func (t *Transaction) ComputeID() string {
    h := sha256.New()
    h.Write(t.Payload())
    for _, in := range t.InputUTXOs {
        h.Write([]byte(in))
    }
    return hex.EncodeToString(h.Sum(nil))
}

// NewTransaction creates a transaction with timestamp and computes ID
func NewTransaction(sender, receiver string, amount int64, note string, inputs []string) *Transaction {
    t := &Transaction{
        SenderID:   sender,
        ReceiverID: receiver,
        Amount:     amount,
        Timestamp:  time.Now().Unix(),
        Note:       note,
        InputUTXOs: inputs,
    }
    t.ID = t.ComputeID()
    return t
}
