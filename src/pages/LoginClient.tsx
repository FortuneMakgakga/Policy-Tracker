import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthCard from '../auth/AuthCard';
import TextInput from '../auth/TextInput';
import PasswordInput from '../auth/PasswordInput';
import { useRole } from '@/auth/RoleProvider';
import { API_BASE } from '@/lib/api';

export default function LoginClient() {
  const navigate = useNavigate();
  const { setRole } = useRole();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/client/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed.');
        return;
      }

      setRole('client');
      localStorage.setItem('clientId', String(data.client_id));
      navigate('/client');
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
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

      {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

      <button
        onClick={handleLogin}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg mt-4 hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>

      <div className="text-center mt-4 space-y-2">
        <button
          onClick={() => navigate('/register-client')}
          className="text-blue-400 underline text-sm"
        >
          Don’t have an account? Register here
        </button>

        <button
          onClick={() => alert('Password reset will be added later.')}
          className="text-gray-500 text-xs"
        >
          Forgot Password?
        </button>
      </div>
    </AuthCard>
  );
}
