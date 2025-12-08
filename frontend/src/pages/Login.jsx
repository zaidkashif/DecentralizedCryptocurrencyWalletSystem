import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";

function Login({ onLogin }) {
  const [hasStoredWallet, setHasStoredWallet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem("wallet");
    setHasStoredWallet(!!saved);
    // Auto-clear messages after 5 seconds
    const timer = setTimeout(() => {
      if (message) setMessage("");
    }, 5000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleLoadStoredWallet = async () => {
    const saved = localStorage.getItem("wallet");
    if (!saved) {
      setHasStoredWallet(false);
      setMessageType("error");
      setMessage("No saved wallet found on this device. Please sign up first.");
      return;
    }
    try {
      setLoading(true);
      const wallet = JSON.parse(saved);
      setMessageType("success");
      setMessage("✓ Loading wallet...");
      // Smooth transition with delay
      setTimeout(() => {
        onLogin(wallet);
        navigate("/dashboard");
      }, 800);
    } catch (err) {
      console.error(err);
      setLoading(false);
      setMessageType("error");
      setMessage("✗ Stored wallet is corrupted. Please sign up again.");
      localStorage.removeItem("wallet");
      setHasStoredWallet(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="max-w-lg w-full">
        <Card>
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-white mb-2">
              CryptoWallet
            </h1>
            <p className="text-slate-300">
              Decentralized Wallet with PoW Blockchain
            </p>
          </div>

          {message && (
            <div
              className={`mb-6 p-3 rounded text-sm ${
                messageType === "success"
                  ? "bg-green-500/20 border border-green-500 text-green-100"
                  : "bg-red-500/20 border border-red-500 text-red-100"
              }`}
            >
              {message}
            </div>
          )}

          {hasStoredWallet && (
            <>
              <p className="text-slate-200 text-sm mb-4 text-center">
                Welcome back! A wallet is already registered on this device.
              </p>
              <button
                onClick={handleLoadStoredWallet}
                disabled={loading}
                className={`w-full font-semibold py-3 rounded-lg text-lg mb-4 transition-all ${
                  loading
                    ? "bg-blue-500/50 text-slate-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {loading ? "⏳ Loading wallet..." : "▶ Load My Wallet"}
              </button>
              <p className="text-xs text-slate-400 text-center mb-6">
                Load your previously registered wallet from this browser.
              </p>
            </>
          )}

          <div
            className={`border-t border-slate-700 pt-6 ${
              hasStoredWallet ? "" : "mt-0"
            }`}
          >
            <p className="text-center text-slate-300 mb-4 text-sm font-semibold">
              🔐 Login to Your Account
            </p>

            <button
              onClick={() => navigate("/login-email")}
              disabled={loading}
              className={`w-full font-semibold py-3 rounded-lg transition-all mb-3 ${
                loading
                  ? "bg-green-500/50 text-slate-300 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }`}
            >
              🔑 Login with Email &amp; Password
            </button>
            <p className="text-xs text-slate-400 text-center mb-4">
              Login from any device with your email and password
            </p>

            <div className="border-t border-slate-700 pt-4 mt-4">
              <p className="text-center text-slate-300 mb-3 text-sm">
                Don't have an account?
              </p>
              <button
                onClick={() => navigate("/register")}
                disabled={loading}
                className={`w-full font-semibold py-2.5 rounded-lg transition-all ${
                  loading
                    ? "bg-slate-600 text-slate-400 cursor-not-allowed"
                    : "bg-slate-700 hover:bg-slate-600 text-white"
                }`}
              >
                + Create New Account
              </button>
              <p className="mt-2 text-xs text-slate-400 text-center">
                Sign up with Email, CNIC and OTP verification. Your private key
                is encrypted and secured.
              </p>
            </div>
          </div>

          <div className="mt-8 text-slate-300 text-sm bg-slate-800/30 border border-slate-700/50 rounded-lg p-3">
            <h3 className="font-semibold mb-2 text-slate-200 text-center">
              🔓 Authentication Methods
            </h3>
            <ul className="space-y-1 text-xs text-slate-400">
              <li>
                <strong className="text-slate-300">📱 Load Wallet:</strong> Same
                device only (from localStorage)
              </li>
              <li>
                <strong className="text-slate-300">🔑 Email + Password:</strong>{" "}
                Any device (secure login)
              </li>
              <li>
                <strong className="text-slate-300">✍️ Sign Up:</strong> Create
                account with OTP verification
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default Login;
