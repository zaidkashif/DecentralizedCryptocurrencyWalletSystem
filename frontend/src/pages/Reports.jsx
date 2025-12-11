import React, { useState, useEffect, useCallback } from "react";
import { walletAPI } from "../api";
import api from "../api";

function Reports({ walletData }) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    totalSent: 0,
    totalReceived: 0,
    zakatPaid: 0,
    transactionCount: 0,
    currentBalance: 0,
    monthlyStats: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState("all");

  const fetchReportData = useCallback(async () => {
    if (!walletData?.wallet_id) return;

    try {
      setLoading(true);

      // Fetch balance
      const balanceRes = await walletAPI.getBalance(walletData.wallet_id);
      const balance = balanceRes.data.balance || 0;

      // Fetch transaction history
      const historyRes = await walletAPI.getHistory(walletData.wallet_id, 100);
      const transactions = historyRes.data.transactions || [];

      // Calculate stats
      let totalSent = 0;
      let totalReceived = 0;
      let zakatPaid = 0;

      transactions.forEach((tx) => {
        if (tx.sender_id === walletData.wallet_id) {
          totalSent += tx.amount || 0;
        }
        if (tx.receiver_id === walletData.wallet_id) {
          totalReceived += tx.amount || 0;
        }
        if (
          tx.note?.toLowerCase().includes("zakat") ||
          tx.type === "zakat_deduction"
        ) {
          zakatPaid += tx.amount || 0;
        }
      });

      // Try to fetch zakat pool info (endpoint may not be available)
      try {
        await api.get("/zakat/pool-balance");
      } catch (e) {
        // Zakat endpoint not available, using transaction-based calculation
      }

      setReportData({
        totalSent,
        totalReceived,
        zakatPaid,
        transactionCount: transactions.length,
        currentBalance: balance,
        monthlyStats: generateMonthlyStats(transactions, walletData.wallet_id),
      });
    } catch (err) {
      console.error("Failed to fetch report data:", err);
    } finally {
      setLoading(false);
    }
  }, [walletData]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const generateMonthlyStats = (transactions, walletId) => {
    const months = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      months[key] = {
        sent: 0,
        received: 0,
        label: date.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
      };
    }

    transactions.forEach((tx) => {
      const date = new Date(tx.timestamp || tx.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0"
      )}`;

      if (months[key]) {
        if (tx.sender_id === walletId) {
          months[key].sent += tx.amount || 0;
        }
        if (tx.receiver_id === walletId) {
          months[key].received += tx.amount || 0;
        }
      }
    });

    return Object.values(months);
  };

  const StatCard = ({ title, value, subtitle, icon, gradient }) => (
    <div
      className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 relative overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8">
        <div className="w-full h-full bg-white/10 rounded-full"></div>
      </div>
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/80 text-sm font-medium">{title}</span>
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            {icon}
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-1">
          {value.toLocaleString()}
        </div>
        <div className="text-white/60 text-sm">{subtitle}</div>
      </div>
    </div>
  );

  const maxBarValue = Math.max(
    ...reportData.monthlyStats.map((m) => Math.max(m.sent, m.received)),
    1
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </span>
              Financial Reports
            </h1>
            <p className="text-slate-400 mt-2">
              Overview of your wallet activity and financial summary
            </p>
          </div>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="week">This Week</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                title="Current Balance"
                value={reportData.currentBalance}
                subtitle="Available coins"
                gradient="from-emerald-600 to-teal-600"
                icon={
                  <svg
                    className="w-5 h-5 text-white"
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
                }
              />
              <StatCard
                title="Total Sent"
                value={reportData.totalSent}
                subtitle="Outgoing transfers"
                gradient="from-blue-600 to-cyan-600"
                icon={
                  <svg
                    className="w-5 h-5 text-white"
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
              />
              <StatCard
                title="Total Received"
                value={reportData.totalReceived}
                subtitle="Incoming transfers"
                gradient="from-violet-600 to-purple-600"
                icon={
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l3-3m-3 3L9 8m-5 5h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293h3.172a1 1 0 00.707-.293l2.414-2.414a1 1 0 01.707-.293H20"
                    />
                  </svg>
                }
              />
              <StatCard
                title="Zakat Paid"
                value={reportData.zakatPaid}
                subtitle="2.5% monthly deduction"
                gradient="from-amber-600 to-orange-600"
                icon={
                  <svg
                    className="w-5 h-5 text-white"
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
                }
              />
            </div>

            {/* Monthly Chart */}
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-white mb-6">
                Monthly Activity
              </h3>
              <div className="space-y-4">
                {reportData.monthlyStats.map((month, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400 w-20">{month.label}</span>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-blue-400">
                          Sent: {month.sent.toLocaleString()}
                        </span>
                        <span className="text-emerald-400">
                          Received: {month.received.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 h-6">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-l-lg transition-all duration-500"
                        style={{ width: `${(month.sent / maxBarValue) * 50}%` }}
                      ></div>
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-r-lg transition-all duration-500"
                        style={{
                          width: `${(month.received / maxBarValue) * 50}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-slate-700">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded"></div>
                  <span className="text-slate-400 text-sm">Sent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded"></div>
                  <span className="text-slate-400 text-sm">Received</span>
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Transaction Summary */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Transaction Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                    <span className="text-slate-400">Total Transactions</span>
                    <span className="text-white font-semibold">
                      {reportData.transactionCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                    <span className="text-slate-400">Net Flow</span>
                    <span
                      className={`font-semibold ${
                        reportData.totalReceived - reportData.totalSent >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {reportData.totalReceived - reportData.totalSent >= 0
                        ? "+"
                        : ""}
                      {(
                        reportData.totalReceived - reportData.totalSent
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-slate-400">Avg Transaction</span>
                    <span className="text-white font-semibold">
                      {reportData.transactionCount > 0
                        ? Math.round(
                            (reportData.totalSent + reportData.totalReceived) /
                              reportData.transactionCount
                          ).toLocaleString()
                        : 0}
                    </span>
                  </div>
                </div>
              </div>

              {/* Zakat Summary */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Zakat Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                    <span className="text-slate-400">Total Zakat Paid</span>
                    <span className="text-amber-400 font-semibold">
                      {reportData.zakatPaid.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
                    <span className="text-slate-400">Zakat Rate</span>
                    <span className="text-white font-semibold">
                      2.5% Monthly
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="text-slate-400">Next Deduction</span>
                    <span className="text-slate-300 font-semibold">
                      ~
                      {Math.round(
                        reportData.currentBalance * 0.025
                      ).toLocaleString()}{" "}
                      coins
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Options */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => {
                  const data = JSON.stringify(reportData, null, 2);
                  const blob = new Blob([data], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `wallet-report-${
                    new Date().toISOString().split("T")[0]
                  }.json`;
                  a.click();
                }}
                className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-medium transition-all"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export Report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Reports;
