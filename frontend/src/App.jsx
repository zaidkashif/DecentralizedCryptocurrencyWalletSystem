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
import AdminLogin from "./pages/AdminLogin";
import Profile from "./pages/Profile";
import Beneficiaries from "./pages/Beneficiaries";
import SystemLogs from "./pages/SystemLogs";
import Reports from "./pages/Reports";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [walletData, setWalletData] = useState(null);

  // Separate admin authentication state
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminData, setAdminData] = useState(null);

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

    // Load admin session from localStorage
    const savedAdmin = localStorage.getItem("adminSession");
    if (savedAdmin) {
      try {
        const parsedAdmin = JSON.parse(savedAdmin);
        setAdminData(parsedAdmin);
        setIsAdminLoggedIn(true);
      } catch {
        localStorage.removeItem("adminSession");
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

  // Admin login handler
  const handleAdminLogin = (admin) => {
    setAdminData(admin);
    localStorage.setItem("adminSession", JSON.stringify(admin));
    setIsAdminLoggedIn(true);
  };

  // Admin logout handler
  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    setAdminData(null);
    localStorage.removeItem("adminSession");
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
            path="/beneficiaries"
            element={
              isLoggedIn ? (
                <Beneficiaries walletData={walletData} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/logs"
            element={
              isLoggedIn ? (
                <SystemLogs walletData={walletData} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/reports"
            element={
              isLoggedIn ? (
                <Reports walletData={walletData} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          <Route
            path="/admin"
            element={
              isAdminLoggedIn ? (
                <AdminPanel
                  adminData={adminData}
                  onAdminLogout={handleAdminLogout}
                />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />

          {/* Admin Login Route - Separate from user auth */}
          <Route
            path="/admin/login"
            element={
              isAdminLoggedIn ? (
                <Navigate to="/admin" replace />
              ) : (
                <AdminLogin onAdminLogin={handleAdminLogin} />
              )
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
