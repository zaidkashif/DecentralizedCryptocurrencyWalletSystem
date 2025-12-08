import React, { useState } from "react";
import { transactionAPI } from "../api";
import Card from "../components/Card";

function SendMoney({ walletData }) {
  const [receiverId, setReceiverId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!receiverId || !amount) {
        setMessageType("error");
        setMessage("Receiver ID and amount are required");
        return;
      }

      if (Number(amount) <= 0) {
        setMessageType("error");
        setMessage("Amount must be greater than 0");
        return;
      }

      const transaction = {
        sender_id: walletData.wallet_id,
        receiver_id: receiverId,
        amount: parseInt(amount),
        note: note || "",
        sender_pub: walletData.public_key,
        sender_priv: walletData.private_key,
      };

      const response = await transactionAPI.submit(transaction);
      setMessageType("success");
      setMessage(`Transaction submitted! ID: ${response.data.tx_id}`);
      setReceiverId("");
      setAmount("");
      setNote("");
    } catch (error) {
      setMessageType("error");
      setMessage(error.response?.data?.error || "Failed to submit transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-md mx-auto">
        <Card title="Send Money">
          {message && (
            <div
              className={`mb-4 p-3 rounded ${
                messageType === "success"
                  ? "bg-green-500 bg-opacity-20 border border-green-500 text-green-200"
                  : "bg-red-500 bg-opacity-20 border border-red-500 text-red-200"
              }`}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">
                Receiver Wallet ID
              </label>
              <input
                type="text"
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                placeholder="Receiver's wallet ID"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">
                Note (Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Transaction note"
                rows="3"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition"
            >
              {loading ? "Sending..." : "Send Transaction"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-gray-400 text-sm">
              ⚠️ Your private key is used only to sign transactions. It never
              leaves your device.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SendMoney;
