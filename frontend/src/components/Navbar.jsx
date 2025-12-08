import React from "react";
import { Link, useLocation } from "react-router-dom";

function Navbar({ walletData, onLogout }) {
  const location = useLocation();

  const linkClasses = (path) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      location.pathname === path
        ? "bg-slate-700 text-white"
        : "text-gray-300 hover:bg-slate-700 hover:text-white"
    }`;

  return (
    <nav className="bg-slate-900/80 border-b border-slate-700 backdrop-blur sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left */}
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="text-xl font-bold text-white">
              CryptoWallet
            </Link>

            {walletData && (
              <div className="hidden md:flex items-center space-x-1">
                <Link to="/dashboard" className={linkClasses("/dashboard")}>
                  Dashboard
                </Link>
                <Link to="/send" className={linkClasses("/send")}>
                  Send Money
                </Link>
                <Link to="/history" className={linkClasses("/history")}>
                  History
                </Link>
                <Link to="/blocks" className={linkClasses("/blocks")}>
                  Block Explorer
                </Link>
                <Link to="/profile" className={linkClasses("/profile")}>
                  Profile
                </Link>
                <Link to="/admin" className={linkClasses("/admin")}>
                  Admin
                </Link>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center space-x-3">
            {walletData && (
              <div className="hidden sm:flex flex-col items-end mr-3">
                <span className="text-sm text-gray-300">
                  {walletData.full_name || "Wallet User"}
                </span>
                <span className="text-xs text-gray-400 font-mono truncate max-w-xs">
                  {walletData.wallet_id}
                </span>
              </div>
            )}

            {walletData && (
              <button
                onClick={onLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
