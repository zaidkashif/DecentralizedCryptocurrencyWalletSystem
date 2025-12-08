import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Navbar from "./components/Navbar";

import Login from "./pages/Login";
import LoginEmail from "./pages/LoginEmail";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import SendMoney from "./pages/SendMoney";
import BlockExplorer from "./pages/BlockExplorer";
import TransactionHistory from "./pages/TransactionHistory";
import AdminPanel from "./pages/AdminPanel";
import Profile from "./pages/Profile";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [walletData, setWalletData] = useState(null);

  // Load wallet from localStorage on first load
  useEffect(() => {
    const saved = localStorage.getItem("wallet");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setWalletData(parsed);
        setIsLoggedIn(true);
      } catch {
        localStorage.removeItem("wallet");
      }
    }
  }, []);

  // Single function used for both login + signup success
  const handleAuthSuccess = (wallet) => {
    // wallet is expected to contain at least:
    // { wallet_id, public_key, user_id?, email?, full_name?, cnic? }
    setWalletData(wallet);
    localStorage.setItem("wallet", JSON.stringify(wallet));
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setWalletData(null);
    localStorage.removeItem("wallet");
  };

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        {isLoggedIn && (
          <Navbar walletData={walletData} onLogout={handleLogout} />
        )}

        <Routes>
          {/* Landing – if logged in show dashboard, else login */}
          <Route
            path="/"
            element={
              isLoggedIn ? (
                <Dashboard walletData={walletData} />
              ) : (
                <Login onLogin={handleAuthSuccess} />
              )
            }
          />

          {/* Public auth pages */}
          <Route
            path="/login"
            element={<Login onLogin={handleAuthSuccess} />}
          />
          <Route
            path="/login-email"
            element={<LoginEmail onLogin={handleAuthSuccess} />}
          />
          <Route
            path="/register"
            element={<Register onRegisterSuccess={handleAuthSuccess} />}
          />

          {/* Protected pages */}
          <Route
            path="/dashboard"
            element={
              isLoggedIn ? (
                <Dashboard walletData={walletData} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/send"
            element={
              isLoggedIn ? (
                <SendMoney walletData={walletData} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/blocks"
            element={
              isLoggedIn ? <BlockExplorer /> : <Navigate to="/login" replace />
            }
          />

          <Route
            path="/history"
            element={
              isLoggedIn ? (
                <TransactionHistory walletData={walletData} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/profile"
            element={
              isLoggedIn ? (
                <Profile walletData={walletData} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/admin"
            element={
              isLoggedIn ? <AdminPanel /> : <Navigate to="/login" replace />
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
