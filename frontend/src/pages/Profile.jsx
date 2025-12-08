import React, { useEffect, useState, useCallback } from "react";
import { profileAPI, authAPI } from "../api";
import Card from "../components/Card";

function Profile({ walletData }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Profile Update State
  const [fullName, setFullName] = useState("");
  const [zakatEnabled, setZakatEnabled] = useState(true);

  // Email Change State
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailStep, setEmailStep] = useState(1); // 1: Request, 2: Confirm
  const [msg, setMsg] = useState("");

  // FIX: Wrap fetchProfile in useCallback so it's stable across renders
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

  // FIX: Add fetchProfile to dependency array
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await profileAPI.updateProfile(profile.user_id, fullName, zakatEnabled);
      setMsg("Profile updated successfully!");
      setEditMode(false);
      fetchProfile(); // Refresh
    } catch (err) {
      setMsg("Failed to update profile.");
    }
  };

  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    try {
      const res = await authAPI.requestEmailChange(profile.user_id, newEmail);
      setMsg(`OTP sent to ${newEmail}`);
      // Show OTP in console for demo if backend sends it
      if (res.data.otp) console.log("Email Change OTP:", res.data.otp);
      setEmailStep(2);
    } catch (err) {
      setMsg("Failed to send OTP.");
    }
  };

  const handleConfirmEmailChange = async (e) => {
    e.preventDefault();
    try {
      await authAPI.confirmEmailChange(profile.user_id, newEmail, emailOtp);
      setMsg("Email updated successfully! Please re-login.");
      setShowEmailChange(false);
      fetchProfile();
    } catch (err) {
      setMsg("Invalid OTP.");
    }
  };

  if (loading)
    return <div className="text-white text-center mt-10">Loading...</div>;

  if (!profile)
    return (
      <div className="text-red-400 text-center mt-10">Profile not found.</div>
    );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Wallet Profile</h1>

      {msg && (
        <div className="bg-blue-600/20 text-blue-200 p-3 rounded mb-4">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Details">
          {!editMode ? (
            <div className="space-y-3 text-white">
              <p>
                <span className="text-gray-400 text-sm">Name:</span>{" "}
                {profile.full_name}
              </p>
              <p>
                <span className="text-gray-400 text-sm">Email:</span>{" "}
                {profile.email}
              </p>
              <p>
                <span className="text-gray-400 text-sm">CNIC:</span>{" "}
                {profile.cnic}
              </p>
              <p>
                <span className="text-gray-400 text-sm">Wallet ID:</span>{" "}
                <span className="font-mono text-xs break-all">
                  {profile.wallet_id}
                </span>
              </p>
              <p>
                <span className="text-gray-400 text-sm">Zakat:</span>{" "}
                {profile.zakat_enabled ? "✅ Enabled" : "❌ Disabled"}
              </p>

              <div className="pt-4 flex gap-2">
                <button
                  onClick={() => setEditMode(true)}
                  className="bg-blue-600 px-4 py-2 rounded text-sm hover:bg-blue-700"
                >
                  Edit Details
                </button>
                <button
                  onClick={() => setShowEmailChange(!showEmailChange)}
                  className="bg-slate-600 px-4 py-2 rounded text-sm hover:bg-slate-700"
                >
                  Change Email
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm">Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-700 p-2 rounded text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={zakatEnabled}
                  onChange={(e) => setZakatEnabled(e.target.checked)}
                  className="w-5 h-5"
                />
                <label className="text-white">Enable Auto Zakat (2.5%)</label>
              </div>
              <div className="flex gap-2">
                <button className="bg-green-600 px-4 py-2 rounded text-white text-sm hover:bg-green-700">
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="bg-gray-600 px-4 py-2 rounded text-white text-sm hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Card>

        {showEmailChange && (
          <Card title="Change Email (Re-verification)">
            {emailStep === 1 ? (
              <form onSubmit={handleRequestEmailChange} className="space-y-4">
                <input
                  type="email"
                  placeholder="New Email Address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-700 p-2 rounded text-white"
                  required
                />
                <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white p-2 rounded">
                  Send OTP
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmEmailChange} className="space-y-4">
                <p className="text-sm text-gray-400">OTP sent to {newEmail}</p>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value)}
                  className="w-full bg-slate-700 p-2 rounded text-white"
                  required
                />
                <button className="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded">
                  Verify & Update
                </button>
              </form>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

export default Profile;
