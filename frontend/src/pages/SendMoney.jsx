import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { transactionAPI, profileAPI } from "../api";

function SendMoney({ walletData }) {
  const [searchParams] = useSearchParams();
  const [receiverId, setReceiverId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [showBeneficiaries, setShowBeneficiaries] = useState(false);

  useEffect(() => {
    // Pre-fill receiver from URL params (from beneficiary quick send)
    const receiver = searchParams.get("receiver");
    if (receiver) setReceiverId(receiver);

    // Fetch beneficiaries for quick selection
    const fetchBeneficiaries = async () => {
      if (walletData?.user_id) {
        try {
          const res = await profileAPI.getBeneficiaries(walletData.user_id);
          setBeneficiaries(res.data.beneficiaries || []);
        } catch (e) {
          console.log("Could not fetch beneficiaries");
        }
      }
    };
    fetchBeneficiaries();
  }, [searchParams, walletData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!receiverId || !amount) {
        setMessageType("error");
        setMessage("Receiver ID and amount are required");
        setLoading(false);
        return;
      }

      if (Number(amount) <= 0) {
        setMessageType("error");
        setMessage("Amount must be greater than 0");
        setLoading(false);
        return;
      }

      if (receiverId === walletData.wallet_id) {
        setMessageType("error");
        setMessage("Cannot send to your own wallet");
        setLoading(false);
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
      setMessage(
        `Transaction submitted successfully! TX ID: ${response.data.txid?.substring(
          0,
          16
        )}...`
      );
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="bg-gradient-to-r from-blue-500 to-cyan-500 p-2 rounded-lg">
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
            </span>
            Send Money
          </h1>
          <p className="text-slate-400 mt-2">
            Transfer coins to another wallet securely
          </p>
        </div>

        {/* Transaction Form */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-xl">
          {message && (
            <div
              className={`mb-6 p-4 rounded-xl border ${
                messageType === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}
            >
              <div className="flex items-center gap-2">
                {messageType === "success" ? (
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
                {message}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Receiver ID */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">
                  Receiver Wallet ID
                </label>
                {beneficiaries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowBeneficiaries(!showBeneficiaries)}
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    Select Beneficiary
                  </button>
                )}
              </div>

              {showBeneficiaries && beneficiaries.length > 0 && (
                <div className="mb-3 bg-slate-900/50 rounded-xl p-3 space-y-2">
                  {beneficiaries.map((ben, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setReceiverId(ben.wallet_id);
                        setShowBeneficiaries(false);
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50 transition-all text-left"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-medium text-sm">
                        {ben.beneficiary_name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="text-white text-sm">
                          {ben.beneficiary_name}
                        </p>
                        <p className="text-slate-500 text-xs font-mono">
                          {ben.wallet_id?.substring(0, 20)}...
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <input
                type="text"
                value={receiverId}
                onChange={(e) => setReceiverId(e.target.value)}
                placeholder="Enter receiver's wallet ID"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-sm"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Amount
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="1"
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-4 text-white text-2xl font-bold placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                  coins
                </span>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Note (Optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note to this transaction..."
                rows="3"
                className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Processing...
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
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                  Send Transaction
                </>
              )}
            </button>
          </form>

          {/* Security Note */}
          <div className="mt-6 pt-6 border-t border-slate-700/50">
            <div className="flex items-start gap-3 text-slate-400 text-sm">
              <svg
                className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5"
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
              <div>
                <p className="font-medium text-slate-300">Secure Transaction</p>
                <p className="mt-1">
                  Your private key is used locally to sign this transaction. It
                  never leaves your device and is never sent to our servers.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* From Wallet Info */}
        <div className="mt-6 bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4">
          <p className="text-slate-400 text-sm mb-2">Sending from</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center text-white font-bold">
              {walletData?.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <p className="text-white font-medium">
                {walletData?.full_name || "Your Wallet"}
              </p>
              <p className="text-slate-400 text-sm font-mono">
                {walletData?.wallet_id?.substring(0, 24)}...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SendMoney;
