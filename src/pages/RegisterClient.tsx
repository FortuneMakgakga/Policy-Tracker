import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, MapPin } from 'lucide-react';
import AuthCard from '@/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { API_BASE } from '@/lib/api';

const fieldClass =
  'w-full rounded-xl border border-black/10 bg-[#f6f6f6] px-4 py-3 text-black placeholder:text-[#9a9a9a] focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/20 focus:bg-white transition-colors';

export default function RegisterClient() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    province: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (
      !form.name ||
      !form.email ||
      !form.phone ||
      !form.address ||
      !form.province ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError('Please fill in all fields.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/client/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          client_name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          address: form.address,
          province: form.province,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed.');
        return;
      }

      if (data.client_id) {
        localStorage.setItem('clientId', data.client_id.toString());
      }
      localStorage.setItem('clientName', form.name);
      localStorage.setItem('clientPhone', form.phone);

      setSuccess('Account created. Redirecting to login...');
      setTimeout(() => navigate('/login-client'), 900);
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Request repairs and track them live">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-semibold text-black mb-1.5">Full name</label>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Thabo Molefe" className={fieldClass} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-black mb-1.5">Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@email.com" className={fieldClass} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-black mb-1.5">Phone</label>
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="071 234 5678" className={fieldClass} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-black mb-1.5">Home address</label>
          <input name="address" value={form.address} onChange={handleChange} placeholder="123 Example Street, Johannesburg" className={fieldClass} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-black mb-1.5">Province</label>
          <input name="province" value={form.province} onChange={handleChange} placeholder="Gauteng" className={fieldClass} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-black mb-1.5">Password</label>
          <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Create a password" className={fieldClass} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-black mb-1.5">Confirm password</label>
          <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Repeat password" className={fieldClass} />
        </div>

        {error && (
          <p className="text-[#e11900] text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="text-[#0e8345] text-sm bg-green-50 border border-green-100 rounded-xl px-3 py-2">{success}</p>
        )}

        <Button type="submit" className="w-full mt-2" size="lg" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create account'
          )}
        </Button>

        <p className="text-center text-sm text-[#6b6b6b] pt-2">
          Already have an account?{' '}
          <Link to="/login-client" className="font-semibold text-black underline-offset-2 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
