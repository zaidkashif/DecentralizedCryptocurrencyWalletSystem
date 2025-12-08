import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { walletAPI } from "../api";
import Card from "../components/Card";

function LoginEmail({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const navigate = useNavigate();

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    if (!email || !password) {
      setMessageType("error");
      setMessage("Email and password are required.");
      return;
    }

    if (!validateEmail(email)) {
      setMessageType("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await walletAPI.login(email, password);

      const {
        user_id,
        wallet_id,
        public_key,
        private_key_encrypted,
        full_name,
        cnic,
      } = res.data;

      const wallet = {
        user_id,
        wallet_id,
        public_key,
        private_key_encrypted,
        full_name,
        email,
        cnic,
      };

      // Store wallet in localStorage
      localStorage.setItem("wallet", JSON.stringify(wallet));

      onLogin(wallet);
      setMessageType("success");
      setMessage("✓ Login successful!");
      setTimeout(() => navigate("/dashboard"), 1000);
    } catch (err) {
      setLoading(false);
      setMessageType("error");
      setMessage(
        err.response?.data || "Login failed. Please check your credentials."
      );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="max-w-lg w-full">
        <Card title="Login with Email & Password">
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-1 text-sm font-semibold">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-1 text-sm font-semibold">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full font-semibold py-3 rounded-lg transition-all ${
                loading
                  ? "bg-blue-500/50 text-slate-300 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {loading ? "⏳ Logging in..." : "→ Login"}
            </button>

            <p className="text-center text-slate-400 text-sm">
              Don't have an account?{" "}
              <Link to="/register" className="text-blue-400 hover:underline">
                Sign up here
              </Link>
            </p>
          </form>

          <div className="border-t border-slate-700 pt-6 mt-6">
            <p className="text-slate-300 text-sm mb-3">
              Using a different device?
            </p>
            <Link
              to="/login"
              className="block w-full text-center bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg transition-all"
            >
              ← Back to Main Login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default LoginEmail;
