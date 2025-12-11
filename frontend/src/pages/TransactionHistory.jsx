import React, { useState, useEffect } from "react";
import { walletAPI } from "../api";

function TransactionHistory({ walletData }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await walletAPI.getHistory(walletData.wallet_id, 50);
        setTransactions(response.data.transactions || []);
      } catch (error) {
        console.error("Failed to fetch transaction history:", error);
      } finally {
        setLoading(false);
      }
    };

    if (walletData) {
      fetchHistory();
      const interval = setInterval(fetchHistory, 10000);
      return () => clearInterval(interval);
    }
  }, [walletData]);

  const filteredTxs = transactions.filter((tx) => {
    if (filter === "sent") return tx.sender_id === walletData?.wallet_id;
    if (filter === "received") return tx.receiver_id === walletData?.wallet_id;
    return true;
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalSent = transactions
    .filter((tx) => tx.sender_id === walletData?.wallet_id)
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const totalReceived = transactions
    .filter((tx) => tx.receiver_id === walletData?.wallet_id)
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="bg-gradient-to-r from-violet-500 to-purple-500 p-2 rounded-lg">
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
            </span>
            Transaction History
          </h1>
          <p className="text-slate-400 mt-2">
            View all your wallet transactions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Transactions</p>
            <p className="text-2xl font-bold text-white">
              {transactions.length}
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Sent</p>
            <p className="text-2xl font-bold text-red-400">
              {totalSent.toLocaleString()}
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Received</p>
            <p className="text-2xl font-bold text-emerald-400">
              {totalReceived.toLocaleString()}
            </p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Net Flow</p>
            <p
              className={`text-2xl font-bold ${
                totalReceived - totalSent >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {totalReceived - totalSent >= 0 ? "+" : ""}
              {(totalReceived - totalSent).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2">
          {[
            { id: "all", label: "All" },
            { id: "sent", label: "Sent" },
            { id: "received", label: "Received" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                filter === f.id
                  ? "bg-violet-600 text-white"
                  : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Transactions List */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-400">Loading transactions...</p>
            </div>
          ) : filteredTxs.length === 0 ? (
            <div className="p-12 text-center">
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
              <h3 className="text-lg font-medium text-white mb-2">
                No transactions yet
              </h3>
              <p className="text-slate-400 text-sm">
                Your transaction history will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50 bg-slate-900/30">
                      <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">
                        Type
                      </th>
                      <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">
                        From / To
                      </th>
                      <th className="text-right py-4 px-6 text-slate-400 font-medium text-sm">
                        Amount
                      </th>
                      <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">
                        Note
                      </th>
                      <th className="text-left py-4 px-6 text-slate-400 font-medium text-sm">
                        Status
                      </th>
                      <th className="text-right py-4 px-6 text-slate-400 font-medium text-sm">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredTxs.map((tx, idx) => {
                      const isSent = tx.sender_id === walletData?.wallet_id;
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-slate-700/30 transition-all"
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  isSent ? "bg-red-500/20" : "bg-emerald-500/20"
                                }`}
                              >
                                {isSent ? (
                                  <svg
                                    className="w-4 h-4 text-red-400"
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
                                    className="w-4 h-4 text-emerald-400"
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
                              <span
                                className={`font-medium ${
                                  isSent ? "text-red-400" : "text-emerald-400"
                                }`}
                              >
                                {isSent ? "Sent" : "Received"}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-slate-300 font-mono text-sm">
                              {isSent
                                ? tx.receiver_id?.substring(0, 16)
                                : tx.sender_id?.substring(0, 16)}
                              ...
                            </p>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span
                              className={`font-bold ${
                                isSent ? "text-red-400" : "text-emerald-400"
                              }`}
                            >
                              {isSent ? "-" : "+"}
                              {tx.amount?.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <p className="text-slate-400 text-sm truncate max-w-[150px]">
                              {tx.note || "—"}
                            </p>
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                                tx.status === "confirmed"
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                              }`}
                            >
                              {tx.status || "confirmed"}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <p className="text-slate-400 text-sm">
                              {formatDate(tx.timestamp || tx.created_at)}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-slate-700/50">
                {filteredTxs.map((tx, idx) => {
                  const isSent = tx.sender_id === walletData?.wallet_id;
                  return (
                    <div key={idx} className="p-4">
                      <div className="flex items-center justify-between mb-3">
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
                            <p className="text-slate-500 text-xs">
                              {formatDate(tx.timestamp || tx.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-bold ${
                              isSent ? "text-red-400" : "text-emerald-400"
                            }`}
                          >
                            {isSent ? "-" : "+"}
                            {tx.amount?.toLocaleString()}
                          </p>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                              tx.status === "confirmed"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}
                          >
                            {tx.status || "confirmed"}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-400 text-xs font-mono">
                        {isSent ? "To: " : "From: "}
                        {isSent
                          ? tx.receiver_id?.substring(0, 24)
                          : tx.sender_id?.substring(0, 24)}
                        ...
                      </p>
                      {tx.note && (
                        <p className="text-slate-500 text-xs mt-1">
                          Note: {tx.note}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransactionHistory;
