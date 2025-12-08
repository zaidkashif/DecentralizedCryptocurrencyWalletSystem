import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { walletAPI } from "../api";
import Card from "../components/Card";

function Dashboard({ walletData }) {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [utxos, setUtxos] = useState([]);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await walletAPI.getBalance(walletData.wallet_id);
        setBalance(response.data.balance || 0);
        setUtxos(response.data.utxos || []);
      } catch (error) {
        console.error("Failed to fetch balance:", error);
      } finally {
        setLoading(false);
      }
    };

    if (walletData) {
      fetchBalance();
      const interval = setInterval(fetchBalance, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [walletData]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-4xl font-bold text-white mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Balance Card */}
        <Card title="Balance">
          <div className="text-4xl font-bold text-green-400 mb-2">
            {loading ? "..." : balance.toLocaleString()}
          </div>
          <p className="text-gray-400 text-sm">Available Coins</p>
        </Card>

        {/* Wallet ID Card */}
        <Card title="Wallet ID">
          <p className="text-gray-200 font-mono text-sm break-all">
            {walletData.wallet_id}
          </p>
          <button
            onClick={() => navigator.clipboard.writeText(walletData.wallet_id)}
            className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
          >
            Copy
          </button>
        </Card>

        {/* Public Key Card */}
        <Card title="Public Key">
          <p className="text-gray-200 font-mono text-xs break-all">
            {walletData.public_key}
          </p>
          <button
            onClick={() => navigator.clipboard.writeText(walletData.public_key)}
            className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
          >
            Copy
          </button>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Link
          to="/send"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded text-center transition"
        >
          💸 Send Money
        </Link>
        <Link
          to="/blocks"
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded text-center transition"
        >
          ⛓️ Block Explorer
        </Link>
      </div>

      {/* UTXOs Card */}
      <Card title="Unspent Outputs (UTXOs)">
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : utxos.length === 0 ? (
          <p className="text-gray-400">No UTXOs available</p>
        ) : (
          <div className="space-y-3">
            {utxos.map((utxo, idx) => (
              <div key={idx} className="bg-slate-700 p-3 rounded">
                <div className="flex justify-between">
                  <span className="text-gray-300 font-mono text-sm">
                    {utxo.id?.substring(0, 16)}...
                  </span>
                  <span className="text-green-400 font-bold">
                    {utxo.amount} coins
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default Dashboard;
