import React, { useState, useEffect } from "react";
import { blockchainAPI } from "../api";
import Card from "../components/Card";

function AdminPanel() {
  const [minerAddress, setMinerAddress] = useState("");
  const [isValid, setIsValid] = useState(null);
  const [pendingTxs, setPendingTxs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    fetchPendingTransactions();
  }, []);

  const fetchPendingTransactions = async () => {
    try {
      const response = await blockchainAPI.getPending();
      setPendingTxs(response.data.pending_transactions || []);
    } catch (error) {
      console.error("Failed to fetch pending transactions:", error);
    }
  };

  const handleValidateChain = async () => {
    setLoading(true);
    try {
      const response = await blockchainAPI.validate();
      setIsValid(response.data.valid);
      setMessageType(response.data.valid ? "success" : "error");
      setMessage(
        response.data.valid
          ? "✓ Blockchain is valid!"
          : "✗ Blockchain is invalid!"
      );
    } catch (error) {
      setMessageType("error");
      setMessage("Failed to validate blockchain");
    } finally {
      setLoading(false);
    }
  };

  const handleMineBlock = async () => {
    if (!minerAddress.trim()) {
      setMessageType("error");
      setMessage("Please enter miner address");
      return;
    }

    setLoading(true);
    try {
      const response = await blockchainAPI.mine(minerAddress);
      setMessageType("success");
      setMessage(
        `Block mined! Hash: ${response.data.block_hash?.substring(0, 16)}...`
      );
      setMinerAddress("");
      setTimeout(fetchPendingTransactions, 1000);
    } catch (error) {
      setMessageType("error");
      setMessage(error.response?.data?.error || "Failed to mine block");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-4xl font-bold text-white mb-8">Admin Panel</h1>

      {message && (
        <div
          className={`mb-6 p-3 rounded ${
            messageType === "success"
              ? "bg-green-500 bg-opacity-20 border border-green-500 text-green-200"
              : "bg-red-500 bg-opacity-20 border border-red-500 text-red-200"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Mining Card */}
        <Card title="Mine Block">
          <div className="space-y-4">
            <input
              type="text"
              value={minerAddress}
              onChange={(e) => setMinerAddress(e.target.value)}
              placeholder="Miner wallet address"
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleMineBlock}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
            >
              {loading ? "Mining..." : "⛏️ Mine Block"}
            </button>
            <p className="text-gray-400 text-sm">
              Processes pending transactions and creates new block.
            </p>
          </div>
        </Card>

        {/* Validation Card */}
        <Card title="Blockchain Status">
          <div className="space-y-4">
            <button
              onClick={handleValidateChain}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
            >
              {loading ? "Validating..." : "🔍 Validate Chain"}
            </button>
            {isValid !== null && (
              <div
                className={`p-3 rounded text-center font-bold ${
                  isValid
                    ? "bg-green-500 bg-opacity-20 text-green-400"
                    : "bg-red-500 bg-opacity-20 text-red-400"
                }`}
              >
                {isValid ? "✓ Valid" : "✗ Invalid"}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Pending Transactions */}
      <Card title={`Pending Transactions (${pendingTxs.length})`}>
        {pendingTxs.length === 0 ? (
          <p className="text-gray-400">No pending transactions</p>
        ) : (
          <div className="space-y-3">
            {pendingTxs.map((tx, idx) => (
              <div key={idx} className="bg-slate-700 p-3 rounded">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-green-400 font-mono text-sm">
                    {tx.sender_id?.substring(0, 16)}...
                  </span>
                  <span className="font-bold text-yellow-400">{tx.amount}</span>
                  <span className="text-blue-400 font-mono text-sm">
                    {tx.receiver_id?.substring(0, 16)}...
                  </span>
                </div>
                {tx.note && (
                  <p className="text-gray-400 text-sm">Note: {tx.note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default AdminPanel;
