import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { walletAPI } from "../api";
import Card from "../components/Card";

function LoginEmail({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await walletAPI.login(email, password);

      // FIX: Backend now returns 'private_key' (decrypted), NOT encrypted.
      const {
        user_id,
        wallet_id,
        public_key,
        private_key, // Raw key needed for signing
        full_name,
        cnic,
        balance,
      } = res.data;

      if (!private_key) {
        throw new Error("Backend did not return a private key.");
      }

      const wallet = {
        user_id,
        wallet_id,
        public_key,
        private_key, // Store this!
        full_name,
        email,
        cnic,
        balance,
      };

      // Store in localStorage
      localStorage.setItem("wallet", JSON.stringify(wallet));

      onLogin(wallet);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.response?.data || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="max-w-md w-full">
        <Card title="Login">
          {error && (
            <div className="bg-red-500/20 text-red-200 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-gray-300 text-sm">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-700 p-3 rounded text-white"
                required
              />
            </div>
            <div>
              <label className="text-gray-300 text-sm">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-700 p-3 rounded text-white"
                required
              />
            </div>
            <button
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded font-bold"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/register" className="text-sm text-blue-400">
              Create new account
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default LoginEmail;
