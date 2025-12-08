import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { walletAPI } from "../api";
import Card from "../components/Card";

function Register() {
  // Removed onRegisterSuccess prop, we redirect instead
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [cnic, setCNIC] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOTP] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [generatedOTP, setGeneratedOTP] = useState("");
  const navigate = useNavigate();

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMessageType("error");
      setMessage("Passwords do not match");
      return;
    }
    try {
      setLoading(true);
      const res = await walletAPI.signup(email, fullName, cnic);
      setGeneratedOTP(res.data.otp || "");
      setMessageType("success");
      setMessage("OTP Sent! Check your email.");
      setStep(2);
    } catch (err) {
      setMessageType("error");
      setMessage(err.response?.data?.error || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // Register the user
      await walletAPI.verifyOTP(email, otp, fullName, cnic, password);

      setMessageType("success");
      setMessage("✓ Account verified! Redirecting to Login...");

      // Redirect to Login to get the Private Key securely
      setTimeout(() => navigate("/login-email"), 2000);
    } catch (err) {
      setMessageType("error");
      setMessage(err.response?.data?.error || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="max-w-lg w-full">
        <Card title={step === 1 ? "Create Account" : "Verify Email OTP"}>
          {message && (
            <div
              className={`mb-4 p-3 rounded text-sm ${
                messageType === "success"
                  ? "bg-green-500/20 text-green-100"
                  : "bg-red-500/20 text-red-100"
              }`}
            >
              {message}
              {generatedOTP && (
                <div className="mt-1 font-mono text-yellow-300">
                  Demo OTP: {generatedOTP}
                </div>
              )}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleSubmitEmail} className="space-y-4">
              <input
                className="w-full bg-slate-700 p-3 rounded text-white"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <input
                className="w-full bg-slate-700 p-3 rounded text-white"
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className="w-full bg-slate-700 p-3 rounded text-white"
                placeholder="CNIC"
                value={cnic}
                onChange={(e) => setCNIC(e.target.value)}
                required
              />
              <input
                className="w-full bg-slate-700 p-3 rounded text-white"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <input
                className="w-full bg-slate-700 p-3 rounded text-white"
                placeholder="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded font-bold"
              >
                {loading ? "Processing..." : "Next →"}
              </button>
              <div className="text-center mt-2">
                <Link to="/login" className="text-sm text-blue-400">
                  Already have an account?
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <input
                className="w-full bg-slate-700 p-3 rounded text-white text-center text-2xl tracking-widest"
                placeholder="OTP Code"
                value={otp}
                onChange={(e) => setOTP(e.target.value)}
                maxLength={6}
                required
              />
              <button
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded font-bold"
              >
                {loading ? "Verifying..." : "Verify & Create Account"}
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

export default Register;
