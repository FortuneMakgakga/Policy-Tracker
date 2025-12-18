import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthCard from "../auth/AuthCard";
import TextInput from "../auth/TextInput";
import PasswordInput from "../auth/PasswordInput";

export default function LoginAdmin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    localStorage.setItem("userRole", "admin");
    navigate("/admin/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Admin Login</h1>
        <p className="text-gray-400 text-center text-sm mb-6">
          Home Assist Internal Administration Access
        </p>

        <TextInput label="Admin Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <PasswordInput label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <button
          onClick={handleLogin}
          className="w-full bg-red-600 text-white py-2 rounded-lg mt-4 hover:bg-red-700"
        >
          Login
        </button>
      </div>
    </div>
  );
}
