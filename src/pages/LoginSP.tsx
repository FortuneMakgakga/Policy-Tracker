import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthCard from '../auth/AuthCard';
import TextInput from '../auth/TextInput';
import PasswordInput from '../auth/PasswordInput';
import { useRole } from '@/auth/RoleProvider';
import { API_BASE } from '@/lib/api';

export default function LoginSP() {
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
      const res = await fetch(`${API_BASE}/api/sp/login`, {
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

      setRole('sp');
      localStorage.setItem('spId', String(data.sp_id));
      navigate('/sp', { replace: true });
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Service Provider Login"
      subtitle="Access your Home Assist SP dashboard"
    >
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
        className="w-full bg-green-600 text-white py-2 rounded-lg mt-4 hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Logging in...' : 'Login'}
      </button>

      <div className="text-center mt-4 space-y-2">
        <button
          onClick={() => navigate('/register-sp')}
          className="text-green-400 underline text-sm"
        >
          Register as a Service Provider
        </button>

        <button
          onClick={() => alert('Password reset coming soon.')}
          className="text-gray-500 text-xs"
        >
          Forgot Password?
        </button>
      </div>
    </AuthCard>
  );
}
