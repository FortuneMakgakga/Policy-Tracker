import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthCard from '../auth/AuthCard';
import TextInput from '../auth/TextInput';
import PasswordInput from '../auth/PasswordInput';
import { useRole } from '@/auth/RoleProvider';
import { API_BASE } from '@/lib/api';
import { Button } from '@/components/ui/button';

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
    <AuthCard title="Welcome back" subtitle="Log in to request and track repairs">
      <TextInput label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
      <PasswordInput label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-[#e11900] text-sm mb-3">{error}</p>}
      <Button onClick={handleLogin} disabled={loading} className="w-full mt-2" size="lg">
        {loading ? 'Logging in...' : 'Continue'}
      </Button>
      <div className="mt-6 text-center space-y-2">
        <p className="text-sm text-[#6b6b6b]">
          New here?{' '}
          <Link to="/register-client" className="font-semibold text-black underline-offset-2 hover:underline">
            Create an account
          </Link>
        </p>
        <button type="button" onClick={() => alert('Password reset coming soon.')} className="text-xs text-[#6b6b6b] hover:text-black">
          Forgot password?
        </button>
      </div>
    </AuthCard>
  );
}
