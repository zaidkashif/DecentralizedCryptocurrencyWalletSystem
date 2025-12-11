import axios from "axios";

const API_BASE_URL = "http://localhost:8080";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper function to convert base64 to Uint8Array
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Helper function to convert Uint8Array to base64
function uint8ArrayToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Sign transaction payload using Ed25519 (via SubtleCrypto or tweetnacl)
async function signTransaction(privateKeyBase64, payload) {
  // For Ed25519 signing, we'll use the nacl library approach
  // The private key from Go is 64 bytes (seed + public key)
  const privateKey = base64ToUint8Array(privateKeyBase64);

  // Import nacl-like signing using SubtleCrypto
  // Since SubtleCrypto doesn't support Ed25519 in all browsers,
  // we'll send the private key to a signing endpoint on the backend
  // OR use a pure JS implementation

  // For now, let's create the signature server-side via a dedicated endpoint
  return null; // Will be handled by backend
}

// Wallet endpoints
export const walletAPI = {
  create: () => api.post("/wallet/create"), // Internal usage
  fund: (walletId, amount) =>
    api.post("/wallet/fund", { wallet_id: walletId, amount }),

  // FIX: Backend expects query param ?wallet=...
  getBalance: (walletId) => api.get(`/wallet/balance?wallet=${walletId}`),
  getHistory: (walletId, limit = 10) =>
    api.get(`/wallet/history?wallet=${walletId}&limit=${limit}`),

  signup: (email, fullName, cnic) =>
    api.post("/auth/signup", { email, full_name: fullName, cnic }),

  verifyOTP: (email, code, fullName, cnic, password) =>
    api.post("/auth/verify-otp", {
      email,
      code,
      full_name: fullName,
      cnic,
      password,
    }),

  login: (email, password) => api.post("/auth/login", { email, password }),
};

// Transaction endpoints
export const transactionAPI = {
  // Use sign-and-submit endpoint which handles signing server-side
  submit: (transaction) => api.post("/tx/sign-and-submit", transaction),
  // Legacy submit endpoint (requires pre-signed transaction)
  submitSigned: (transaction) => api.post("/tx/submit", transaction),
  getHistory: () => api.get("/tx/history"),
  // Get full transaction details including signature
  getDetails: (txId) => api.get(`/tx/details?tx_id=${txId}`),
};

// Blockchain endpoints
export const blockchainAPI = {
  getBlocks: () => api.get("/blockchain/blocks"),
  mine: (minerAddress) =>
    api.post("/blockchain/mine", { miner_address: minerAddress }),
  validate: () => api.get("/blockchain/validate"),
  getPending: () => api.get("/blockchain/pending"),
};

// Profile endpoints
export const profileAPI = {
  // FIX: Backend expects query param ?wallet_id=...
  getProfile: (walletId) => api.get(`/profile/get?wallet_id=${walletId}`),

  // Update Name & Zakat Settings
  updateProfile: (userId, fullName, zakatEnabled) =>
    api.post("/profile/update", {
      user_id: userId,
      full_name: fullName,
      zakat_enabled: zakatEnabled,
    }),

  getBeneficiaries: (userId) =>
    api.get(`/profile/beneficiaries?user_id=${userId}`),

  addBeneficiary: (userId, walletId, beneficiaryName) =>
    api.post("/profile/beneficiaries/add", {
      user_id: userId,
      wallet_id: walletId,
      beneficiary_name: beneficiaryName,
    }),

  removeBeneficiary: (beneficiaryId) =>
    api.post("/profile/beneficiaries/remove", {
      beneficiary_id: beneficiaryId,
    }),
};

// Auth endpoints (Email Change)
export const authAPI = {
  requestEmailChange: (userId, newEmail) =>
    api.post("/auth/request-email-change", {
      user_id: userId,
      new_email: newEmail,
    }),

  confirmEmailChange: (userId, newEmail, code) =>
    api.post("/auth/confirm-email-change", {
      user_id: userId,
      new_email: newEmail,
      code,
    }),
};

// Zakat endpoints
export const zakatAPI = {
  getPool: () => api.get("/zakat/pool-balance"),
  trigger: () => api.post("/zakat/trigger"),
};

export const healthCheck = () => api.get("/health");

export default api;
