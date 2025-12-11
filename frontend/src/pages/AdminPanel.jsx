import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { blockchainAPI, zakatAPI, walletAPI } from "../api";

function AdminPanel({ adminData, onAdminLogout }) {
  const navigate = useNavigate();
  const [minerAddress, setMinerAddress] = useState("");
  const [isValid, setIsValid] = useState(null);
  const [pendingTxs, setPendingTxs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [miningInProgress, setMiningInProgress] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [chainStats, setChainStats] = useState({ blocks: 0, transactions: 0 });
  const [zakatPool, setZakatPool] = useState(0);
  const [fundWalletId, setFundWalletId] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [fundingInProgress, setFundingInProgress] = useState(false);

  useEffect(() => {
    fetchPendingTransactions();
    fetchChainStats();
    fetchZakatPool();
  }, []);

  const fetchPendingTransactions = async () => {
    try {
      const response = await blockchainAPI.getPending();
      setPendingTxs(response.data.pending_transactions || []);
    } catch (error) {
      console.error("Failed to fetch pending transactions:", error);
    }
  };

  const fetchChainStats = async () => {
    try {
      const response = await blockchainAPI.getBlocks();
      const chain = response.data.chain || response.data.blocks || [];
      const totalTxs = chain.reduce(
        (sum, block) => sum + (block.transactions?.length || 0),
        0
      );
      setChainStats({ blocks: chain.length, transactions: totalTxs });
    } catch (error) {
      console.error("Failed to fetch chain stats:", error);
    }
  };

  const fetchZakatPool = async () => {
    try {
      const response = await zakatAPI.getPool();
      setZakatPool(response.data.pool_balance || 0);
    } catch (error) {
      console.error("Failed to fetch zakat pool:", error);
    }
  };

  const handleValidateChain = async () => {
    setLoading(true);
    try {
      const response = await blockchainAPI.validate();
      setIsValid(response.data.valid);
      setMessage({
        type: response.data.valid ? "success" : "error",
        text: response.data.valid
          ? "Blockchain is valid and secure!"
          : "Blockchain validation failed - integrity compromised!",
      });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to validate blockchain" });
    } finally {
      setLoading(false);
    }
  };

  const handleMineBlock = async () => {
    if (!minerAddress.trim()) {
      setMessage({
        type: "error",
        text: "Please enter a miner wallet address",
      });
      return;
    }

    setMiningInProgress(true);
    try {
      const response = await blockchainAPI.mine(minerAddress);
      setMessage({
        type: "success",
        text: `Block mined successfully! Hash: ${response.data.block_hash?.substring(
          0,
          20
        )}...`,
      });
      setMinerAddress("");
      setTimeout(() => {
        fetchPendingTransactions();
        fetchChainStats();
      }, 1000);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to mine block",
      });
    } finally {
      setMiningInProgress(false);
    }
  };

  const handleTriggerZakat = async () => {
    setLoading(true);
    try {
      await zakatAPI.trigger();
      setMessage({
        type: "success",
        text: "Zakat deduction triggered successfully!",
      });
      setTimeout(() => {
        fetchZakatPool();
        fetchPendingTransactions();
      }, 1000);
    } catch (error) {
      setMessage({ type: "error", text: "Failed to trigger zakat deduction" });
    } finally {
      setLoading(false);
    }
  };

  const handleFundWallet = async () => {
    if (!fundWalletId.trim()) {
      setMessage({ type: "error", text: "Please enter a wallet ID" });
      return;
    }
    if (!fundAmount || parseInt(fundAmount) <= 0) {
      setMessage({ type: "error", text: "Please enter a valid amount" });
      return;
    }

    setFundingInProgress(true);
    try {
      await walletAPI.fund(fundWalletId, parseInt(fundAmount));
      setMessage({
        type: "success",
        text: `Successfully added ${parseInt(
          fundAmount
        ).toLocaleString()} coins to wallet!`,
      });
      setFundWalletId("");
      setFundAmount("");
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to fund wallet",
      });
    } finally {
      setFundingInProgress(false);
    }
  };

  const handleLogout = () => {
    if (onAdminLogout) {
      onAdminLogout();
    }
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Admin Top Bar */}
      <div className="bg-slate-800/80 border-b border-red-500/20 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-red-500 to-orange-500 p-2 rounded-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                <p className="text-slate-400 text-xs">
                  Logged in as:{" "}
                  <span className="text-red-400 font-medium">
                    {adminData?.username || "Admin"}
                  </span>
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-all"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="bg-gradient-to-r from-red-500 to-orange-500 p-2 rounded-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </span>
            Admin Panel
          </h1>
          <p className="text-slate-400 mt-2">
            Manage blockchain operations and system settings
          </p>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {message.type === "success" ? (
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <span>{message.text}</span>
            <button
              onClick={() => setMessage({ type: "", text: "" })}
              className="ml-auto text-current hover:opacity-70"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-violet-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Blocks</p>
                <p className="text-2xl font-bold text-white">
                  {chainStats.blocks}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Transactions</p>
                <p className="text-2xl font-bold text-white">
                  {chainStats.transactions}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Pending</p>
                <p className="text-2xl font-bold text-white">
                  {pendingTxs.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-teal-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Zakat Pool</p>
                <p className="text-2xl font-bold text-white">
                  {zakatPool.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Mining Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-600/20 to-violet-600/20">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                  />
                </svg>
                Mine Block
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Miner Wallet Address
                </label>
                <input
                  type="text"
                  value={minerAddress}
                  onChange={(e) => setMinerAddress(e.target.value)}
                  placeholder="Enter wallet address for mining reward"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-sm"
                />
              </div>
              <button
                onClick={handleMineBlock}
                disabled={miningInProgress}
                className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  miningInProgress
                    ? "bg-blue-600/50 text-slate-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white shadow-lg shadow-blue-500/20"
                }`}
              >
                {miningInProgress ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Mining block...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Mine Block
                  </>
                )}
              </button>
              <p className="text-slate-500 text-xs">
                Mining processes all pending transactions and adds a new block
                to the blockchain.
              </p>
            </div>
          </div>

          {/* Validation & Actions Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-purple-600/20 to-pink-600/20">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
                System Actions
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <button
                onClick={handleValidateChain}
                disabled={loading}
                className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  loading
                    ? "bg-purple-600/50 text-slate-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/20"
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Validating...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    Validate Blockchain
                  </>
                )}
              </button>

              {isValid !== null && (
                <div
                  className={`p-4 rounded-xl flex items-center gap-3 ${
                    isValid
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : "bg-red-500/10 border border-red-500/30 text-red-400"
                  }`}
                >
                  {isValid ? (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                  <span className="font-medium">
                    {isValid ? "Blockchain Valid" : "Blockchain Invalid"}
                  </span>
                </div>
              )}

              <div className="border-t border-slate-700/50 pt-4">
                <button
                  onClick={handleTriggerZakat}
                  disabled={loading}
                  className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    loading
                      ? "bg-teal-600/50 text-slate-300 cursor-not-allowed"
                      : "bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-500/20"
                  }`}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Trigger Zakat Deduction
                </button>
                <p className="text-slate-500 text-xs mt-2">
                  Manually trigger 2.5% zakat deduction for all eligible
                  wallets.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fund Wallet Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-emerald-600/20 to-green-600/20">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Fund Wallet (Add Money)
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Wallet ID
                </label>
                <input
                  type="text"
                  value={fundWalletId}
                  onChange={(e) => setFundWalletId(e.target.value)}
                  placeholder="Enter wallet ID to fund"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  Amount
                </label>
                <input
                  type="number"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="Enter amount to add"
                  min="1"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>
            <button
              onClick={handleFundWallet}
              disabled={fundingInProgress}
              className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                fundingInProgress
                  ? "bg-emerald-600/50 text-slate-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-500/20"
              }`}
            >
              {fundingInProgress ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Adding funds...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Add Funds to Wallet
                </>
              )}
            </button>
            <p className="text-slate-500 text-xs mt-2">
              Add coins to any wallet for testing or initial funding. This
              creates new UTXOs.
            </p>
          </div>
        </div>

        {/* Pending Transactions */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg
                className="w-5 h-5 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Pending Transactions
            </h3>
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium">
              {pendingTxs.length} pending
            </span>
          </div>
          <div className="p-6">
            {pendingTxs.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-white mb-2">
                  No Pending Transactions
                </h4>
                <p className="text-slate-400 text-sm">
                  All transactions have been processed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTxs.map((tx, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                          <svg
                            className="w-4 h-4 text-amber-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        </div>
                        <span className="text-amber-400 text-sm font-medium">
                          Pending
                        </span>
                      </div>
                      <span className="text-xl font-bold text-white">
                        {tx.amount?.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center text-sm text-slate-400">
                      <span className="font-mono truncate flex-1">
                        {tx.sender_id?.substring(0, 20)}...
                      </span>
                      <svg
                        className="w-4 h-4 mx-2 text-slate-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                      <span className="font-mono truncate flex-1 text-right">
                        {tx.receiver_id?.substring(0, 20)}...
                      </span>
                    </div>
                    {tx.note && (
                      <p className="text-slate-500 text-xs mt-2 truncate">
                        Note: {tx.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
