import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { walletAPI } from "../api";
import Card from "../components/Card";

function Register({ onRegisterSuccess }) {
  const [step, setStep] = useState(1); // 1: email+CNIC, 2: OTP
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cnic, setCNIC] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOTP] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" | "error"
  const [generatedOTP, setGeneratedOTP] = useState(""); // dev/demo
  const navigate = useNavigate();

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (pwd) => {
    if (pwd.length < 8) return "Password must be at least 8 characters";
    if (!/[a-zA-Z]/.test(pwd)) return "Password must contain letters";
    if (!/[0-9]/.test(pwd)) return "Password must contain numbers";
    return null;
  };

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    if (!fullName || !email || !cnic || !password || !confirmPassword) {
      setMessageType("error");
      setMessage("All fields are required.");
      return;
    }

    if (!validateEmail(email)) {
      setMessageType("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    const pwdError = validatePassword(password);
    if (pwdError) {
      setMessageType("error");
      setMessage(pwdError);
      return;
    }

    if (password !== confirmPassword) {
      setMessageType("error");
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await walletAPI.signup(email, fullName, cnic);

      // backend returns otp for dev/demo
      setGeneratedOTP(res.data.otp || "");
      setMessageType("success");
      setMessage("✓ OTP sent. Check your email. (Demo OTP shown below.)");
      setStep(2);
    } catch (err) {
      setMessageType("error");
      setMessage(err.response?.data || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");

    if (!otp) {
      setMessageType("error");
      setMessage("Please enter the OTP you received.");
      return;
    }

    try {
      setLoading(true);
      const res = await walletAPI.verifyOTP(
        email,
        otp,
        fullName,
        cnic,
        password
      );

      const { user_id, wallet_id, public_key } = res.data;

      const wallet = {
        user_id,
        wallet_id,
        public_key,
        full_name: fullName,
        email,
        cnic,
      };

      onRegisterSuccess(wallet);
      setMessageType("success");
      setMessage("✓ Account created successfully!");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      setMessageType("error");
      setMessage(err.response?.data || "Invalid or expired OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="max-w-lg w-full">
        <Card
          title={
            step === 1 ? "Create Account (Step 1/2)" : "Verify OTP (Step 2/2)"
          }
        >
          {message && (
            <div
              className={`mb-4 p-3 rounded text-sm ${
                messageType === "success"
                  ? "bg-green-500/20 border border-green-500 text-green-100"
                  : "bg-red-500/20 border border-red-500 text-red-100"
              }`}
            >
              {message}
              {generatedOTP && (
                <span className="block text-xs mt-2 text-yellow-200 bg-yellow-900/20 p-2 rounded">
                  📌 Demo Mode - Your OTP:{" "}
                  <strong className="font-mono">{generatedOTP}</strong>
                </span>
              )}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSubmitEmail} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1 text-sm font-semibold">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

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
                  CNIC / National ID
                </label>
                <input
                  type="text"
                  value={cnic}
                  onChange={(e) => setCNIC(e.target.value)}
                  placeholder="12345-6789012-3"
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
                  placeholder="Min 8 chars, letters + numbers"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  • At least 8 characters • Letters & numbers required
                </p>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 text-sm font-semibold">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
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
                {loading ? "⏳ Sending OTP..." : "→ Send OTP to Email"}
              </button>

              <p className="text-xs text-center text-slate-400 mt-4">
                Already have an account?{" "}
                <Link
                  to="/login-email"
                  className="text-blue-400 hover:underline"
                >
                  Login here
                </Link>
              </p>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1 text-sm font-semibold">
                  Enter OTP Code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOTP(e.target.value.slice(0, 6))}
                  placeholder="000000"
                  maxLength="6"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-center text-2xl tracking-widest font-mono"
                />
                <p className="text-xs text-slate-400 mt-2">
                  A 6-digit code has been sent to <strong>{email}</strong>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full font-semibold py-3 rounded-lg transition-all ${
                  loading
                    ? "bg-green-500/50 text-slate-300 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {loading ? "⏳ Verifying..." : "✓ Verify & Create Account"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOTP("");
                  setGeneratedOTP("");
                  setMessage("");
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 rounded-lg transition-all"
              >
                ← Back to Form
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

export default Register;
