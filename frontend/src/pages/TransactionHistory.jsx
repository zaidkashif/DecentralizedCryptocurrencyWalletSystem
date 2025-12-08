import React, { useState, useEffect } from "react";
import { walletAPI } from "../api";
import Card from "../components/Card";

function TransactionHistory({ walletData }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await walletAPI.getHistory(walletData.wallet_id, 20);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-4xl font-bold text-white mb-8">
        Transaction History
      </h1>

      <Card>
        {loading ? (
          <p className="text-gray-400 text-center">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="text-gray-400 text-center">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left py-3 px-4 text-gray-300">From</th>
                  <th className="text-left py-3 px-4 text-gray-300">To</th>
                  <th className="text-right py-3 px-4 text-gray-300">Amount</th>
                  <th className="text-left py-3 px-4 text-gray-300">Note</th>
                  <th className="text-left py-3 px-4 text-gray-300">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-700 hover:bg-slate-700 transition"
                  >
                    <td className="py-3 px-4 text-gray-300 font-mono text-sm">
                      {tx.sender_id?.substring(0, 16)}...
                    </td>
                    <td className="py-3 px-4 text-gray-300 font-mono text-sm">
                      {tx.receiver_id?.substring(0, 16)}...
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className="text-yellow-400">{tx.amount}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {tx.note || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          tx.status === "confirmed"
                            ? "bg-green-500 bg-opacity-20 text-green-400"
                            : "bg-yellow-500 bg-opacity-20 text-yellow-400"
                        }`}
                      >
                        {tx.status || "pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default TransactionHistory;
