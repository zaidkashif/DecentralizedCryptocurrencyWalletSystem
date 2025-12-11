import React, { useEffect, useState, useCallback } from "react";
import { profileAPI, authAPI } from "../api";

function Profile({ walletData }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState("");
  const [zakatEnabled, setZakatEnabled] = useState(true);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailStep, setEmailStep] = useState(1);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [copied, setCopied] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!walletData?.wallet_id) return;
    try {
      const res = await profileAPI.getProfile(walletData.wallet_id);
      setProfile(res.data);
      setFullName(res.data.full_name);
      setZakatEnabled(res.data.zakat_enabled);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [walletData]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await profileAPI.updateProfile(profile.user_id, fullName, zakatEnabled);
      setMsg({ type: "success", text: "Profile updated successfully!" });
      setEditMode(false);
      fetchProfile();
    } catch (err) {
      setMsg({ type: "error", text: "Failed to update profile." });
    }
  };

  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    try {
      const res = await authAPI.requestEmailChange(profile.user_id, newEmail);
      setMsg({ type: "success", text: `OTP sent to ${newEmail}` });
      if (res.data.otp) console.log("Email Change OTP:", res.data.otp);
      setEmailStep(2);
    } catch (err) {
      setMsg({ type: "error", text: "Failed to send OTP." });
    }
  };

  const handleConfirmEmailChange = async (e) => {
    e.preventDefault();
    try {
      await authAPI.confirmEmailChange(profile.user_id, newEmail, emailOtp);
      setMsg({
        type: "success",
        text: "Email updated successfully! Please re-login.",
      });
      setShowEmailChange(false);
      fetchProfile();
    } catch (err) {
      setMsg({ type: "error", text: "Invalid OTP." });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <p className="text-red-400">Profile not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="bg-gradient-to-r from-violet-500 to-purple-500 p-2 rounded-lg">
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </span>
            Profile Settings
          </h1>
          <p className="text-slate-400 mt-2">
            Manage your account and security settings
          </p>
        </div>

        {/* Message Alert */}
        {msg.text && (
          <div
            className={`mb-6 p-4 rounded-xl border ${
              msg.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            <div className="flex items-center gap-2">
              {msg.type === "success" ? (
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
              {msg.text}
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden mb-6">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                {profile.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {profile.full_name}
                </h2>
                <p className="text-white/80">{profile.email}</p>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-6">
            {!editMode ? (
              <div className="space-y-4">
                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <p className="text-slate-400 text-sm mb-1">Full Name</p>
                    <p className="text-white font-medium">
                      {profile.full_name}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <p className="text-slate-400 text-sm mb-1">Email Address</p>
                    <p className="text-white font-medium">{profile.email}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <p className="text-slate-400 text-sm mb-1">CNIC</p>
                    <p className="text-white font-medium font-mono">
                      {profile.cnic}
                    </p>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4">
                    <p className="text-slate-400 text-sm mb-1">
                      Zakat Auto-Deduction
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          profile.zakat_enabled
                            ? "bg-emerald-400"
                            : "bg-red-400"
                        }`}
                      ></span>
                      <span
                        className={
                          profile.zakat_enabled
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {profile.zakat_enabled ? "Enabled (2.5%)" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Wallet ID */}
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-slate-400 text-sm mb-2">Wallet ID</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-violet-300 text-xs font-mono break-all bg-slate-800 p-2 rounded-lg">
                      {profile.wallet_id}
                    </code>
                    <button
                      onClick={() => copyToClipboard(profile.wallet_id)}
                      className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                      title="Copy Wallet ID"
                    >
                      {copied ? (
                        <svg
                          className="w-5 h-5 text-emerald-400"
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
                          className="w-5 h-5 text-slate-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4">
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-xl transition-all"
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowEmailChange(!showEmailChange);
                      setEmailStep(1);
                      setNewEmail("");
                      setEmailOtp("");
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
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
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Change Email
                  </button>
                </div>
              </div>
            ) : (
              /* Edit Mode Form */
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    Full Name
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-xl text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-900/50 rounded-xl">
                  <input
                    type="checkbox"
                    id="zakatToggle"
                    checked={zakatEnabled}
                    onChange={(e) => setZakatEnabled(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-violet-600 focus:ring-violet-500"
                  />
                  <div>
                    <label
                      htmlFor="zakatToggle"
                      className="text-white font-medium cursor-pointer"
                    >
                      Enable Auto Zakat Deduction
                    </label>
                    <p className="text-slate-400 text-sm">
                      2.5% will be automatically deducted monthly
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-all"
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Email Change Modal */}
        {showEmailChange && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-violet-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Change Email Address
              </h3>
              <p className="text-slate-400 text-sm mt-1">
                We'll send a verification code to your new email
              </p>
            </div>

            <div className="p-6">
              {emailStep === 1 ? (
                <form onSubmit={handleRequestEmailChange} className="space-y-4">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">
                      New Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="Enter new email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/20"
                  >
                    Send Verification Code
                  </button>
                </form>
              ) : (
                <form onSubmit={handleConfirmEmailChange} className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-3 rounded-lg text-sm">
                    Verification code sent to {newEmail}
                  </div>
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-2">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-xl text-white text-center text-xl tracking-widest placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                      maxLength={6}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Verify & Update Email
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Security Note */}
        <div className="mt-6 bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-white font-medium">Security Tip</h4>
              <p className="text-slate-400 text-sm mt-1">
                Keep your wallet ID secure and never share your private keys.
                Enable Zakat deduction to fulfill your religious obligations
                automatically.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
