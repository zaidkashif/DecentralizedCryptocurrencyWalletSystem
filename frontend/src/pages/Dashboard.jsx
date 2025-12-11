import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { walletAPI } from "../api";
import api from "../api";

function Dashboard({ walletData }) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [utxos, setUtxos] = useState([]);
  const [recentTxs, setRecentTxs] = useState([]);
  const [zakatPool, setZakatPool] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const balanceRes = await walletAPI.getBalance(walletData.wallet_id);
        setBalance(balanceRes.data.balance || 0);
        setUtxos(balanceRes.data.utxos || []);

        const historyRes = await walletAPI.getHistory(walletData.wallet_id, 5);
        setRecentTxs(historyRes.data.transactions || []);

        try {
          const zakatRes = await api.get("/zakat/pool-balance");
          setZakatPool(zakatRes.data.balance || 0);
        } catch (e) {
          console.log("Zakat endpoint not available");
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (walletData) {
      fetchData();
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    }
  }, [walletData]);

  const QuickAction = ({ to, icon, label, gradient }) => (
    <Link
      to={to}
      className={`bg-gradient-to-br ${gradient} p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:scale-105 transition-all duration-200 shadow-lg`}
    >
      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <span className="text-white font-medium text-sm">{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome back,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              {walletData?.full_name || "User"}
            </span>
          </h1>
          <p className="text-slate-400 mt-1">
            Here's an overview of your wallet
          </p>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Balance Card - Large */}
          <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full transform translate-x-20 -translate-y-20"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full transform -translate-x-16 translate-y-16"></div>

            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-blue-200 text-sm font-medium mb-1">
                    Total Balance
                  </p>
                  <h2 className="text-5xl font-bold text-white">
                    {loading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      balance.toLocaleString()
                    )}
                  </h2>
                  <p className="text-blue-200 text-sm mt-1">Available Coins</p>
                </div>
                <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div>
                  <p className="text-blue-200 text-xs mb-1">Wallet ID</p>
                  <p className="text-white font-mono text-sm truncate">
                    {walletData?.wallet_id}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-blue-200 text-xs mb-1">UTXOs</p>
                  <p className="text-white font-semibold">
                    {utxos.length} unspent
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Side Stats */}
          <div className="space-y-4">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Zakat Pool</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {zakatPool.toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-slate-500 text-xs mt-2">
                2.5% monthly deduction
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Est. Next Zakat</p>
                  <p className="text-2xl font-bold text-purple-400">
                    ~{Math.round(balance * 0.025).toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-slate-500 text-xs mt-2">
                Calculated at month end
              </p>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Transactions</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {recentTxs.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-slate-500 text-xs mt-2">Recent activity</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <QuickAction
              to="/send"
              gradient="from-blue-600 to-cyan-600"
              icon={
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
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              }
              label="Send Money"
            />
            <QuickAction
              to="/history"
              gradient="from-violet-600 to-purple-600"
              icon={
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
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
              label="History"
            />
            <QuickAction
              to="/blocks"
              gradient="from-amber-600 to-orange-600"
              icon={
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
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              }
              label="Blocks"
            />
            <QuickAction
              to="/beneficiaries"
              gradient="from-emerald-600 to-teal-600"
              icon={
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
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              }
              label="Beneficiaries"
            />
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Transactions */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Recent Transactions
              </h3>
              <Link
                to="/history"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                View all →
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-slate-700/50 h-16 rounded-xl"
                  ></div>
                ))}
              </div>
            ) : recentTxs.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
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
                <p className="text-slate-400">No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTxs.map((tx, idx) => {
                  const isSent = tx.sender_id === walletData?.wallet_id;
                  return (
                    <div
                      key={idx}
                      className="bg-slate-900/50 rounded-xl p-4 hover:bg-slate-700/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isSent ? "bg-red-500/20" : "bg-emerald-500/20"
                            }`}
                          >
                            {isSent ? (
                              <svg
                                className="w-5 h-5 text-red-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 11l5-5m0 0l5 5m-5-5v12"
                                />
                              </svg>
                            ) : (
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
                                  d="M17 13l-5 5m0 0l-5-5m5 5V6"
                                />
                              </svg>
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {isSent ? "Sent" : "Received"}
                            </p>
                            <p className="text-slate-500 text-xs font-mono">
                              {isSent
                                ? tx.receiver_id?.substring(0, 12)
                                : tx.sender_id?.substring(0, 12)}
                              ...
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-semibold ${
                              isSent ? "text-red-400" : "text-emerald-400"
                            }`}
                          >
                            {isSent ? "-" : "+"}
                            {tx.amount?.toLocaleString()}
                          </p>
                          <p className="text-slate-500 text-xs">
                            {tx.status || "confirmed"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* UTXOs */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Unspent Outputs (UTXOs)
              </h3>
              <span className="text-slate-400 text-sm">
                {utxos.length} total
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-slate-700/50 h-14 rounded-xl"
                  ></div>
                ))}
              </div>
            ) : utxos.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
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
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <p className="text-slate-400">No UTXOs available</p>
                <p className="text-slate-500 text-sm mt-1">
                  Fund your wallet to get started
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {utxos.map((utxo, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900/50 rounded-xl p-4 flex items-center justify-between hover:bg-slate-700/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-emerald-400"
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
                      </div>
                      <span className="text-slate-400 font-mono text-sm">
                        {utxo.id?.substring(0, 16)}...
                      </span>
                    </div>
                    <span className="text-emerald-400 font-semibold">
                      {utxo.amount?.toLocaleString()} coins
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Wallet Info Card */}
        <div className="mt-8 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Wallet Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-slate-400 text-sm mb-2">Public Key</p>
              <div className="bg-slate-900/50 rounded-xl p-4">
                <p className="text-slate-300 font-mono text-xs break-all">
                  {walletData?.public_key}
                </p>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(walletData?.public_key)
                  }
                  className="mt-3 text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
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
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy
                </button>
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-2">Wallet ID</p>
              <div className="bg-slate-900/50 rounded-xl p-4">
                <p className="text-slate-300 font-mono text-xs break-all">
                  {walletData?.wallet_id}
                </p>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(walletData?.wallet_id)
                  }
                  className="mt-3 text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
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
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
