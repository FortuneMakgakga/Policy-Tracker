import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import AuthCard from '@/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { clientApi } from '@/lib/api';

const fieldClass =
  'w-full rounded-xl border border-black/10 bg-[#f6f6f6] px-4 py-3 text-black placeholder:text-[#9a9a9a] focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/20 focus:bg-white transition-colors';

const STEPS = ['Account', 'Home address', 'Done'] as const;

export default function RegisterClient() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [account, setAccount] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    suburb: '',
    city: '',
    province: '',
    postal_code: '',
    latitude: '',
    longitude: '',
  });

  function onAccountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAccount({ ...account, [e.target.name]: e.target.value });
  }

  function onAddressChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAddress({ ...address, [e.target.name]: e.target.value });
  }

  async function submitStep1(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!account.name || !account.email || !account.password) {
      setError('Name, email and password are required.');
      return;
    }
    if (account.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (account.password !== account.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const data = await clientApi.registerStart({
        name: account.name,
        email: account.email,
        password: account.password,
        phone: account.phone || undefined,
      });
      if (data.client_id) {
        localStorage.setItem('clientId', String(data.client_id));
      }
      localStorage.setItem('clientName', account.name);
      if (account.phone) localStorage.setItem('clientPhone', account.phone);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setLoading(false);
    }
  }

  async function submitStep2(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!address.line1) {
      setError('Street address is required.');
      return;
    }
    if (!address.latitude || !address.longitude) {
      setError('Latitude and longitude are required (use "Use my location" or enter them).');
      return;
    }
    const lat = parseFloat(address.latitude);
    const lng = parseFloat(address.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError('Latitude and longitude must be numbers.');
      return;
    }
    setLoading(true);
    try {
      await clientApi.registerStep2({
        line1: address.line1,
        line2: address.line2 || undefined,
        suburb: address.suburb || undefined,
        city: address.city || undefined,
        province: address.province || undefined,
        postal_code: address.postal_code || undefined,
        latitude: lat,
        longitude: lng,
        label: 'home',
      });
      await clientApi.registerComplete();
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save address.');
    } finally {
      setLoading(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAddress((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
      },
      () => setError('Could not get your location. Enter coordinates manually.')
    );
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle={
        step === 3
          ? 'You are ready to request repairs'
          : `Step ${step} of 2 \u2014 ${STEPS[step - 1]}`
      }
    >
      {step < 3 && (
        <div className="flex gap-2 mb-6">
          {STEPS.slice(0, 2).map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex-1">
                <div
                  className={`h-1.5 rounded-full mb-2 ${
                    done || active ? 'bg-black' : 'bg-black/10'
                  }`}
                />
                <p
                  className={`text-xs font-medium ${
                    active ? 'text-black' : 'text-[#9a9a9a]'
                  }`}
                >
                  {n}. {label}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="text-[#e11900] text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {step === 1 && (
        <form onSubmit={submitStep1} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Full name</label>
            <input name="name" value={account.name} onChange={onAccountChange} placeholder="Thabo Molefe" className={fieldClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Email</label>
            <input name="email" type="email" value={account.email} onChange={onAccountChange} placeholder="you@email.com" className={fieldClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Phone (optional)</label>
            <input name="phone" value={account.phone} onChange={onAccountChange} placeholder="071 234 5678" className={fieldClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Password</label>
            <input name="password" type="password" value={account.password} onChange={onAccountChange} placeholder="At least 6 characters" className={fieldClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Confirm password</label>
            <input name="confirmPassword" type="password" value={account.confirmPassword} onChange={onAccountChange} placeholder="Repeat password" className={fieldClass} />
          </div>
          <Button type="submit" className="w-full mt-2" size="lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Creating account...
              </>
            ) : (
              <>
                Continue <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
          <p className="text-center text-sm text-[#6b6b6b] pt-2">
            Already have an account?{' '}
            <Link to="/login-client" className="font-semibold text-black underline-offset-2 hover:underline">
              Log in
            </Link>
          </p>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={submitStep2} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Street address</label>
            <input name="line1" value={address.line1} onChange={onAddressChange} placeholder="123 Example Street" className={fieldClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Unit / complex (optional)</label>
            <input name="line2" value={address.line2} onChange={onAddressChange} placeholder="Unit 4" className={fieldClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-black mb-1.5">Suburb</label>
              <input name="suburb" value={address.suburb} onChange={onAddressChange} placeholder="Sandton" className={fieldClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-1.5">City</label>
              <input name="city" value={address.city} onChange={onAddressChange} placeholder="Johannesburg" className={fieldClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-black mb-1.5">Province</label>
              <input name="province" value={address.province} onChange={onAddressChange} placeholder="Gauteng" className={fieldClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-1.5">Postal code</label>
              <input name="postal_code" value={address.postal_code} onChange={onAddressChange} placeholder="2196" className={fieldClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Pin on map</label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <input name="latitude" value={address.latitude} onChange={onAddressChange} placeholder="Latitude" className={fieldClass} />
              <input name="longitude" value={address.longitude} onChange={onAddressChange} placeholder="Longitude" className={fieldClass} />
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={useMyLocation}>
              Use my location
            </Button>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={loading}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button type="submit" className="flex-1" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                'Finish'
              )}
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="text-center space-y-4 py-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
            <Check className="w-7 h-7 text-[#0e8345]" />
          </div>
          <p className="text-black font-semibold text-lg">Registration complete</p>
          <p className="text-sm text-[#6b6b6b]">
            Your home address is saved. You can request repairs and track them live.
          </p>
          <Button className="w-full" size="lg" onClick={() => navigate('/login-client')}>
            Continue to login
          </Button>
        </div>
      )}
    </AuthCard>
  );
}
