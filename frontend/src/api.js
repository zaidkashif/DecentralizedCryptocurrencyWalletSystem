import axios from "axios";

const API_BASE_URL = "http://localhost:8080";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Wallet endpoints
export const walletAPI = {
  create: () => api.post("/wallet/create"),
  fund: (walletId, amount) =>
    api.post("/wallet/fund", { wallet_id: walletId, amount }),
  getBalance: (walletId) => api.get(`/wallet/balance/${walletId}`),
  getHistory: (walletId, limit = 10) =>
    api.get(`/wallet/history/${walletId}`, { params: { limit } }),
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
  submit: (transaction) => api.post("/tx/submit", transaction),
  getHistory: () => api.get("/tx/history"),
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
  getProfile: (walletId) =>
    api.get("/profile/get", { params: { wallet_id: walletId } }),
  updateProfile: (userId, fullName, email) =>
    api.post("/profile/update", {
      user_id: userId,
      full_name: fullName,
      email,
    }),
  getBeneficiaries: (userId) =>
    api.get("/profile/beneficiaries", { params: { user_id: userId } }),
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

// Auth endpoints
export const authAPI = {
  signup: (email, fullName, cnic) =>
    api.post("/auth/signup", { email, full_name: fullName, cnic }),

  verifyOTP: (email, code, fullName, cnic) =>
    api.post("/auth/verify-otp", {
      email,
      code,
      full_name: fullName,
      cnic,
    }),

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

// Health check
export const healthCheck = () => api.get("/health");

export default api;
