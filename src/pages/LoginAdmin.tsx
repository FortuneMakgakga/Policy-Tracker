import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import TextInput from '../auth/TextInput';
import PasswordInput from '../auth/PasswordInput';
import { toast } from 'sonner';
import { useRole } from '@/auth/RoleProvider';
import { API_BASE } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Home, ShieldCheck } from 'lucide-react';

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
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setRole('admin');
      toast.success('Welcome back');
      navigate('/admin');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f6] flex flex-col">
      <header className="px-6 py-5">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center">
            <Home className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight">Home Assist</span>
        </Link>
      </header>
      <div className="flex-1 flex items-start justify-center px-4 pt-8">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-xs font-semibold mb-4">
              <ShieldCheck className="w-3.5 h-3.5" />
              Staff only
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Staff login</h1>
            <p className="text-[#6b6b6b]">Internal access for Home Assist operations</p>
          </div>
          <div className="bg-white rounded-2xl ha-shadow p-6 sm:p-8 border border-black/5">
            <TextInput label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <PasswordInput label="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button onClick={handleLogin} disabled={loading} className="w-full mt-2" size="lg">
              {loading ? 'Logging in...' : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
