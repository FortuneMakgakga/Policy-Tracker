import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthCard from "../auth/AuthCard";
import TextInput from "../auth/TextInput";
import PasswordInput from "../auth/PasswordInput";

export default function LoginSP() {
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

    // ✅ Save SP role for RoleProvider
    localStorage.setItem("userRole", "sp");

    // Navigate to SP dashboard
    navigate("/sp");
  };

  return (
    <AuthCard title="Service Provider Login" subtitle="Access your Home Assist SP dashboard">
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
        className="w-full bg-green-600 text-white py-2 rounded-lg mt-4 hover:bg-green-700"
      >
        Login
      </button>

      <div className="text-center mt-4 space-y-2">
        <button 
          onClick={() => navigate("/register-sp")}
          className="text-green-600 underline text-sm"
        >
          Register as a Service Provider
        </button>

        <button 
          onClick={() => alert("Password reset coming soon.")}
          className="text-gray-500 text-xs"
        >
          Forgot Password?
        </button>
      </div>
    </AuthCard>
  );
}
