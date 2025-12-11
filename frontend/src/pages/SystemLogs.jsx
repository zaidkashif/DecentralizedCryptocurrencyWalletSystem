import React, { useState, useEffect, useCallback } from "react";
import api from "../api";

function SystemLogs({ walletData }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.get(`/admin/logs`, {
        params: {
          wallet_id: walletData?.wallet_id,
          limit: 100,
        },
      });
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      // Mock data for demo
      setLogs([
        {
          id: 1,
          action: "login_success",
          wallet_id: walletData?.wallet_id,
          details: "Successful login from browser",
          status: "success",
          ip_address: "192.168.1.1",
          timestamp: new Date().toISOString(),
        },
        {
          id: 2,
          action: "tx_sent",
          wallet_id: walletData?.wallet_id,
          details: "Transaction sent: 100 coins",
          status: "confirmed",
          ip_address: "192.168.1.1",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 3,
          action: "tx_received",
          wallet_id: walletData?.wallet_id,
          details: "Transaction received: 50 coins",
          status: "confirmed",
          ip_address: "N/A",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 4,
          action: "zakat_deduction",
          wallet_id: walletData?.wallet_id,
          details: "Monthly Zakat: 25 coins (2.5%)",
          status: "processed",
          ip_address: "system",
          timestamp: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 5,
          action: "failed_login",
          wallet_id: walletData?.wallet_id,
          details: "Invalid password attempt",
          status: "failed",
          ip_address: "192.168.1.5",
          timestamp: new Date(Date.now() - 172800000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [walletData]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionIcon = (action) => {
    switch (action) {
      case "login_success":
        return (
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
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
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
          </div>
        );
      case "failed_login":
        return (
          <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        );
      case "tx_sent":
        return (
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
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
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </div>
        );
      case "tx_received":
        return (
          <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
            <svg
              className="w-5 h-5 text-cyan-400"
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
          </div>
        );
      case "zakat_deduction":
        return (
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
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
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
        );
      case "mining":
        return (
          <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
            <svg
              className="w-5 h-5 text-yellow-400"
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
        );
      default:
        return (
          <div className="w-10 h-10 bg-slate-500/20 rounded-xl flex items-center justify-center">
            <svg
              className="w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        );
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      confirmed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      processed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      failed: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    return (
      <span
        className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
          styles[status] || styles.pending
        }`}
      >
        {status}
      </span>
    );
  };

  const filteredLogs = logs.filter((log) => {
    if (filter !== "all" && log.action !== filter) return false;
    if (
      searchTerm &&
      !log.details.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;
    return true;
  });

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 p-2 rounded-lg">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </span>
            System Logs
          </h1>
          <p className="text-slate-400 mt-2">
            View all system activities, transactions, and security events
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <svg
              className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
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
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search logs..."
              className="w-full bg-slate-800/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
          >
            <option value="all">All Events</option>
            <option value="login_success">Login Success</option>
            <option value="failed_login">Failed Login</option>
            <option value="tx_sent">Transactions Sent</option>
            <option value="tx_received">Transactions Received</option>
            <option value="zakat_deduction">Zakat Deductions</option>
            <option value="mining">Mining Events</option>
          </select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Events", value: logs.length, color: "blue" },
            {
              label: "Transactions",
              value: logs.filter((l) => l.action.includes("tx")).length,
              color: "emerald",
            },
            {
              label: "Login Events",
              value: logs.filter((l) => l.action.includes("login")).length,
              color: "purple",
            },
            {
              label: "Zakat Events",
              value: logs.filter((l) => l.action === "zakat_deduction").length,
              color: "amber",
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4"
            >
              <p className="text-slate-400 text-sm">{stat.label}</p>
              <p className={`text-2xl font-bold text-${stat.color}-400`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Logs List */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-400">Loading logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                No logs found
              </h3>
              <p className="text-slate-400 text-sm">
                Try adjusting your filters or search term.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50">
              {filteredLogs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="p-4 hover:bg-slate-700/30 transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    {getActionIcon(log.action)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h4 className="text-white font-medium capitalize">
                            {log.action.replace(/_/g, " ")}
                          </h4>
                          <p className="text-slate-400 text-sm mt-1">
                            {log.details}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(log.status)}
                          <span className="text-slate-500 text-xs">
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                            />
                          </svg>
                          {log.ip_address}
                        </span>
                        <span className="font-mono">
                          {log.wallet_id?.substring(0, 16)}...
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SystemLogs;
