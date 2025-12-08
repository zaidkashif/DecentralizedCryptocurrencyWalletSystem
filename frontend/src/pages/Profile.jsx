import React, { useEffect, useState } from "react";
import Card from "../components/Card";

function Profile({ walletData }) {
  const [profile, setProfile] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ full_name: "", email: "" });

  const [newBeneficiary, setNewBeneficiary] = useState({
    wallet_id: "",
    name: "",
  });

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [publicKeyBase64, setPublicKeyBase64] = useState("");
  const [zakatInfo, setZakatInfo] = useState({
    last_deduction: null,
    enabled: true,
  });

  // Helpers for localStorage keys
  const walletId = walletData?.wallet_id;
  const walletKey = "wallet"; // main wallet object already used in App.jsx
  const beneficiariesKey = walletId ? `beneficiaries_${walletId}` : null;
  const zakatKey = walletId ? `zakat_${walletId}` : null;

  useEffect(() => {
    if (!walletId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1) Base profile from walletData / localStorage
      let storedWallet = walletData;
      const raw = localStorage.getItem(walletKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          storedWallet = { ...storedWallet, ...parsed };
        } catch {
          // ignore parse error
        }
      }

      const baseProfile = {
        full_name: storedWallet.full_name || "",
        email: storedWallet.email || "",
        cnic: storedWallet.cnic || "",
        wallet_id: storedWallet.wallet_id,
        public_key: storedWallet.public_key || "",
      };

      setProfile(baseProfile);
      setFormData({
        full_name: baseProfile.full_name,
        email: baseProfile.email,
      });

      // 2) Public key → base64 if needed
      let pk = "";
      if (typeof baseProfile.public_key === "string") {
        pk = baseProfile.public_key;
      } else if (baseProfile.public_key) {
        pk = btoa(
          String.fromCharCode.apply(
            null,
            new Uint8Array(baseProfile.public_key)
          )
        );
      }
      setPublicKeyBase64(pk);

      // 3) Beneficiaries from localStorage
      if (beneficiariesKey) {
        const benRaw = localStorage.getItem(beneficiariesKey);
        if (benRaw) {
          try {
            const parsed = JSON.parse(benRaw);
            setBeneficiaries(parsed);
          } catch {
            setBeneficiaries([]);
          }
        }
      }

      // 4) Zakat info from localStorage
      if (zakatKey) {
        const zakRaw = localStorage.getItem(zakatKey);
        if (zakRaw) {
          try {
            const parsed = JSON.parse(zakRaw);
            setZakatInfo({
              last_deduction: parsed.last_deduction || null,
              enabled:
                typeof parsed.enabled === "boolean" ? parsed.enabled : true,
            });
          } catch {
            // keep defaults
          }
        }
      }

      setMessage("");
      setMessageType("");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletId]);

  const persistWalletProfile = (updatedProfile) => {
    // Update "wallet" object in localStorage so Dashboard/Nav also see changes
    const raw = localStorage.getItem(walletKey);
    let stored = {};
    if (raw) {
      try {
        stored = JSON.parse(raw);
      } catch {
        stored = {};
      }
    }
    const merged = {
      ...stored,
      full_name: updatedProfile.full_name,
      email: updatedProfile.email,
      cnic: updatedProfile.cnic,
      wallet_id: updatedProfile.wallet_id,
      public_key: updatedProfile.public_key,
    };
    localStorage.setItem(walletKey, JSON.stringify(merged));
  };

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    if (!profile) return;

    const updated = {
      ...profile,
      full_name: formData.full_name,
      email: formData.email,
    };

    setProfile(updated);
    persistWalletProfile(updated);

    setMessageType("success");
    setMessage(
      "Profile updated locally. (In a full system, email changes would trigger OTP re-verification and update DB.)"
    );
    setEditMode(false);
  };

  const handleAddBeneficiary = (e) => {
    e.preventDefault();
    if (!newBeneficiary.wallet_id || !newBeneficiary.name) {
      setMessageType("error");
      setMessage("Beneficiary wallet ID and name are required");
      return;
    }

    const updated = [
      ...beneficiaries,
      {
        id: Date.now(),
        beneficiary_wallet_id: newBeneficiary.wallet_id,
        beneficiary_name: newBeneficiary.name,
      },
    ];
    setBeneficiaries(updated);
    if (beneficiariesKey) {
      localStorage.setItem(beneficiariesKey, JSON.stringify(updated));
    }

    setNewBeneficiary({ wallet_id: "", name: "" });
    setMessageType("success");
    setMessage("Beneficiary added (stored locally).");
  };

  const handleRemoveBeneficiary = (id) => {
    const updated = beneficiaries.filter((b) => b.id !== id);
    setBeneficiaries(updated);
    if (beneficiariesKey) {
      localStorage.setItem(beneficiariesKey, JSON.stringify(updated));
    }
    setMessageType("success");
    setMessage("Beneficiary removed.");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-white text-center">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-red-400 text-center">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-4xl font-bold text-white mb-6">Wallet Profile</h1>

      {message && (
        <div
          className={`mb-6 p-4 rounded ${
            messageType === "success"
              ? "bg-green-500/20 border border-green-500 text-green-100"
              : "bg-red-500/20 border border-red-500 text-red-100"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Left: User Info */}
        <Card title="User Information">
          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-xs">Full Name</label>
              <p className="text-white text-lg">{profile.full_name || "-"}</p>
            </div>
            <div>
              <label className="text-gray-400 text-xs">Email</label>
              <p className="text-white text-lg break-all">
                {profile.email || "-"}
              </p>
            </div>
            <div>
              <label className="text-gray-400 text-xs">
                CNIC / National ID
              </label>
              <p className="text-white text-lg">{profile.cnic || "N/A"}</p>
            </div>
            <div>
              <label className="text-gray-400 text-xs">Wallet ID</label>
              <p className="text-white text-xs font-mono break-all">
                {profile.wallet_id}
              </p>
            </div>
            <div>
              <label className="text-gray-400 text-xs">Public Key</label>
              <p className="text-white text-xs font-mono break-all">
                {publicKeyBase64 || "Not available"}
              </p>
            </div>
            <div>
              <label className="text-gray-400 text-xs">Private Key</label>
              <p className="text-amber-200 text-xs">
                Stored encrypted on backend. Never shown in UI.
              </p>
            </div>

            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Edit Profile
              </button>
            )}
          </div>
        </Card>

        {/* Right: Edit form + Zakat */}
        <div className="space-y-6">
          {editMode && (
            <Card title="Edit Profile">
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-gray-300 text-sm mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 text-sm mb-1">
                    Email (re-verification required)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    In a full system this change would trigger a new OTP check.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </form>
            </Card>
          )}

          <Card title="Zakat Tracking">
            <div className="space-y-2 text-sm text-slate-200">
              <p>
                Monthly 2.5% Zakat is deducted from your balance and transferred
                to the Zakat Pool wallet as a special{" "}
                <span className="font-mono text-xs">zakat_deduction</span>{" "}
                transaction.
              </p>
              <p className="text-slate-400">
                Automatic Zakat:{" "}
                {zakatInfo.enabled ? "Enabled (demo)" : "Disabled"}
              </p>
              <p className="text-slate-400">
                Last deduction:{" "}
                {zakatInfo.last_deduction
                  ? zakatInfo.last_deduction
                  : "Not recorded in demo UI"}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Beneficiaries */}
      <Card title="Beneficiaries">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            Add New Beneficiary
          </h3>
          <form onSubmit={handleAddBeneficiary} className="space-y-3">
            <input
              type="text"
              placeholder="Beneficiary Wallet ID"
              value={newBeneficiary.wallet_id}
              onChange={(e) =>
                setNewBeneficiary({
                  ...newBeneficiary,
                  wallet_id: e.target.value,
                })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500"
            />
            <input
              type="text"
              placeholder="Beneficiary Name"
              value={newBeneficiary.name}
              onChange={(e) =>
                setNewBeneficiary({
                  ...newBeneficiary,
                  name: e.target.value,
                })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-500"
            />
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Add Beneficiary
            </button>
          </form>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-3">
            Your Beneficiaries ({beneficiaries.length})
          </h3>
          {beneficiaries.length === 0 ? (
            <p className="text-gray-400 text-sm">No beneficiaries added yet.</p>
          ) : (
            <div className="space-y-3">
              {beneficiaries.map((ben) => (
                <div
                  key={ben.id}
                  className="bg-slate-700 p-4 rounded flex justify-between items-center"
                >
                  <div>
                    <p className="text-white font-semibold">
                      {ben.beneficiary_name}
                    </p>
                    <p className="text-gray-400 text-xs font-mono break-all">
                      {ben.beneficiary_wallet_id}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveBeneficiary(ben.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default Profile;
