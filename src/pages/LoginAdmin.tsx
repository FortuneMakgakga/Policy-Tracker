import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TextInput from '../auth/TextInput';
import PasswordInput from '../auth/PasswordInput';
import { toast } from 'sonner';
import { useRole } from '@/auth/RoleProvider';
import { API_BASE } from '@/lib/api';

export default function LoginAdmin() {
  const navigate = useNavigate();
  const { setRole } = useRole();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setRole('admin');
      toast.success('Admin logged in');
      navigate('/admin');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">Staff Login</h1>
        <p className="text-gray-400 text-center text-sm mb-6">
          Home Assist Internal Administration Access
        </p>

        <TextInput
          label="Admin Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <PasswordInput
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-red-600 text-white py-2 rounded-lg mt-4 hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </div>
  );
}
