package utxo

import (
    "crypto/sha256"
    "encoding/hex"
    "errors"
    "fmt"
    "sync"
)

// UTXO represents an unspent transaction output
type UTXO struct {
    ID     string
    Owner  string
    Amount int64
    Spent  bool
}

// Manager holds UTXOs in-memory (not persistent). Safe for simple tests.
type Manager struct {
    mu   sync.Mutex
    set  map[string]*UTXO
}

// NewManager creates a UTXO manager
func NewManager() *Manager {
    return &Manager{set: make(map[string]*UTXO)}
}

// AddUTXO adds a UTXO and returns its ID
func (m *Manager) AddUTXO(owner string, amount int64) string {
    m.mu.Lock()
    defer m.mu.Unlock()
    // create id by hashing owner+amount+len
    key := owner + ":" + fmt.Sprintf("%d", amount) + ":" + fmt.Sprintf("%d", len(m.set))
    h := sha256.Sum256([]byte(key))
    id := hex.EncodeToString(h[:])
    u := &UTXO{ID: id, Owner: owner, Amount: amount, Spent: false}
    m.set[id] = u
    return id
}

// GetUnspentByOwner returns unspent UTXOs for owner
func (m *Manager) GetUnspentByOwner(owner string) []*UTXO {
    m.mu.Lock()
    defer m.mu.Unlock()
    var res []*UTXO
    for _, u := range m.set {
        if !u.Spent && u.Owner == owner {
            res = append(res, u)
        }
    }
    return res
}

// Balance returns sum of unspent UTXOs for owner
func (m *Manager) Balance(owner string) int64 {
    m.mu.Lock()
    defer m.mu.Unlock()
    var sum int64
    for _, u := range m.set {
        if !u.Spent && u.Owner == owner {
            sum += u.Amount
        }
    }
    return sum
}

// Spend marks a UTXO as spent; returns error if already spent or not found
func (m *Manager) Spend(utxoID, owner string) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    u, ok := m.set[utxoID]
    if !ok {
        return errors.New("utxo not found")
    }
    if u.Owner != owner {
        return errors.New("owner mismatch")
    }
    if u.Spent {
        return errors.New("utxo already spent")
    }
    u.Spent = true
    return nil
}

// GetUTXO returns a UTXO by id or nil
func (m *Manager) GetUTXO(id string) *UTXO {
    m.mu.Lock()
    defer m.mu.Unlock()
    if u, ok := m.set[id]; ok {
        return u
    }
    return nil
}
