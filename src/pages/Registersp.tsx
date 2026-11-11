import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import AuthCard from '@/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { API_BASE } from '@/lib/api';

const fieldClass =
  'w-full rounded-xl border border-black/10 bg-[#f6f6f6] px-4 py-3 text-black placeholder:text-[#9a9a9a] focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/20 focus:bg-white transition-colors';

export default function SPRegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    province: '',
    skill: '',
    latitude: '',
    longitude: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleGetLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        toast.success('Location captured');
      },
      () => toast.error('Failed to get location')
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (
      !form.name ||
      !form.email ||
      !form.phone ||
      !form.province ||
      !form.skill ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError('Please complete all required fields.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/sp/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          province: form.province,
          skill: form.skill,
          latitude: form.latitude ? parseFloat(form.latitude) : null,
          longitude: form.longitude ? parseFloat(form.longitude) : null,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed.');
        return;
      }

      setSuccess('Provider account created. Redirecting to login...');
      setTimeout(() => navigate('/login-sp'), 900);
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Join as a provider" subtitle="Accept nearby jobs and grow your work">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-semibold text-black mb-1.5">Full name</label>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Sipho Dlamini" className={fieldClass} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-black mb-1.5">Email</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@email.com" className={fieldClass} />
        </div>

        <div>
          <label className="block text-sm font-semibold text-black mb-1.5">Phone</label>
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="072 123 4567" className={fieldClass} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Province</label>
            <input name="province" value={form.province} onChange={handleChange} placeholder="Gauteng" className={fieldClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Skill</label>
            <input name="skill" value={form.skill} onChange={handleChange} placeholder="Plumber" className={fieldClass} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-black mb-1.5">Service area</label>
          <div className="grid grid-cols-2 gap-3 mb-2">
            <input name="latitude" value={form.latitude} onChange={handleChange} placeholder="Latitude" className={fieldClass} />
            <input name="longitude" value={form.longitude} onChange={handleChange} placeholder="Longitude" className={fieldClass} />
          </div>
          <Button type="button" variant="outline" onClick={handleGetLocation} className="w-full">
            <MapPin className="w-4 h-4" />
            Use my location
          </Button>
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
            'Create provider account'
          )}
        </Button>

        <p className="text-center text-sm text-[#6b6b6b] pt-2">
          Already registered?{' '}
          <Link to="/login-sp" className="font-semibold text-black underline-offset-2 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
