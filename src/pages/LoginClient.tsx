import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthCard from "../auth/AuthCard";
import TextInput from "../auth/TextInput";
import PasswordInput from "../auth/PasswordInput";

export default function LoginClient() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    // ✅ Save role correctly for RoleProvider
    localStorage.setItem("userRole", "client");

    // Navigate to client dashboard
    navigate("/client");
  };

  return (
    <AuthCard title="Client Login" subtitle="Welcome back to Home Assist">
      <TextInput 
        label="Email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
      />

      <PasswordInput 
        label="Password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
      />

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

      <button
        onClick={handleLogin}
        className="w-full bg-blue-600 text-white py-2 rounded-lg mt-4 hover:bg-blue-700"
      >
        Login
      </button>

      <div className="text-center mt-4 space-y-2">
        <button 
          onClick={() => navigate("/register-client")}
          className="text-blue-600 underline text-sm"
        >
          Don’t have an account? Register here
        </button>

        <button 
          onClick={() => alert("Password reset will be added later.")}
          className="text-gray-500 text-xs"
        >
          Forgot Password?
        </button>
      </div>
    </AuthCard>
  );
}
