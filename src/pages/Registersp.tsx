import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, ChevronLeft, ChevronRight, Check, MapPin } from 'lucide-react';
import AuthCard from '@/auth/AuthCard';
import { Button } from '@/components/ui/button';
import { lookupsApi, spApi, type Skill } from '@/lib/api';

const fieldClass =
  'w-full rounded-xl border border-black/10 bg-[#f6f6f6] px-4 py-3 text-black placeholder:text-[#9a9a9a] focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/20 focus:bg-white transition-colors';

const STEPS = ['Account', 'Business & address', 'Skills', 'Payout', 'Done'] as const;

export default function SPRegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [skillsCatalog, setSkillsCatalog] = useState<Skill[]>([]);

  const [account, setAccount] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [business, setBusiness] = useState({
    business_name: '',
    bio: '',
    years_experience: '',
    line1: '',
    line2: '',
    suburb: '',
    city: '',
    province: '',
    postal_code: '',
    latitude: '',
    longitude: '',
  });

  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);

  const [payout, setPayout] = useState({
    method_type: 'cash' as 'cash' | 'bank',
    bank_name: '',
    account_holder: '',
    account_number: '',
    branch_code: '',
    account_type: 'cheque',
  });

  useEffect(() => {
    if (step === 3 && skillsCatalog.length === 0) {
      lookupsApi
        .skills()
        .then((res) => setSkillsCatalog(res.skills || []))
        .catch(() => setSkillsCatalog([]));
    }
  }, [step, skillsCatalog.length]);

  function onAccountChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAccount({ ...account, [e.target.name]: e.target.value });
  }

  function onBusinessChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setBusiness({ ...business, [e.target.name]: e.target.value });
  }

  function onPayoutChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setPayout({ ...payout, [e.target.name]: e.target.value });
  }

  function toggleSkill(id: number) {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusiness((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
      },
      () => setError('Could not get location.')
    );
  }

  async function submitStep1(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!account.name || !account.email || !account.phone || !account.password) {
      setError('Name, email, phone and password are required.');
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
      const data = await spApi.registerStart({
        name: account.name,
        email: account.email,
        phone: account.phone,
        password: account.password,
      });
      if (data.sp_id) localStorage.setItem('spId', String(data.sp_id));
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
    if (!business.line1 || !business.latitude || !business.longitude) {
      setError('Address line and coordinates are required.');
      return;
    }
    const lat = parseFloat(business.latitude);
    const lng = parseFloat(business.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError('Latitude and longitude must be numbers.');
      return;
    }
    setLoading(true);
    try {
      await spApi.registerStep2({
        business_name: business.business_name || undefined,
        bio: business.bio || undefined,
        years_experience: business.years_experience
          ? parseInt(business.years_experience, 10)
          : undefined,
        addresses: [
          {
            label: 'home',
            line1: business.line1,
            line2: business.line2 || undefined,
            suburb: business.suburb || undefined,
            city: business.city || undefined,
            province: business.province || undefined,
            postal_code: business.postal_code || undefined,
            latitude: lat,
            longitude: lng,
          },
        ],
      });
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save business info.');
    } finally {
      setLoading(false);
    }
  }

  async function submitStep3(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (selectedSkillIds.length === 0) {
      setError('Select at least one skill.');
      return;
    }
    setLoading(true);
    try {
      await spApi.registerStep3({ skill_ids: selectedSkillIds });
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save skills.');
    } finally {
      setLoading(false);
    }
  }

  async function submitStep4(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (payout.method_type === 'bank') {
      if (!payout.account_holder || !payout.account_number) {
        setError('Account holder and account number are required for bank payout.');
        return;
      }
    }
    setLoading(true);
    try {
      await spApi.registerStep4(
        payout.method_type === 'cash'
          ? { method_type: 'cash' }
          : {
              method_type: 'bank',
              bank_name: payout.bank_name || undefined,
              account_holder: payout.account_holder,
              account_number: payout.account_number,
              branch_code: payout.branch_code || undefined,
              account_type: payout.account_type || undefined,
            }
      );
      await spApi.registerComplete();
      setStep(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish registration.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Join as a provider"
      subtitle={
        step === 5
          ? 'Submitted for review'
          : `Step ${step} of 4 - ${STEPS[step - 1]}`
      }
    >
      {step < 5 && (
        <div className="flex gap-1.5 mb-6">
          {STEPS.slice(0, 4).map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <div key={label} className="flex-1">
                <div
                  className={`h-1.5 rounded-full mb-1.5 ${
                    done || active ? 'bg-black' : 'bg-black/10'
                  }`}
                />
                <p className={`text-[10px] sm:text-xs font-medium truncate ${active ? 'text-black' : 'text-[#9a9a9a]'}`}>
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
            <input name="name" value={account.name} onChange={onAccountChange} placeholder="Sipho Dlamini" className={fieldClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Email</label>
            <input name="email" type="email" value={account.email} onChange={onAccountChange} placeholder="you@email.com" className={fieldClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Phone</label>
            <input name="phone" value={account.phone} onChange={onAccountChange} placeholder="072 123 4567" className={fieldClass} />
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
                <Loader2 className="w-4 h-4 animate-spin" /> Creating...
              </>
            ) : (
              <>
                Continue <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
          <p className="text-center text-sm text-[#6b6b6b] pt-2">
            Already registered?{' '}
            <Link to="/login-sp" className="font-semibold text-black underline-offset-2 hover:underline">
              Log in
            </Link>
          </p>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={submitStep2} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Business name (optional)</label>
            <input name="business_name" value={business.business_name} onChange={onBusinessChange} placeholder="Sipho Plumbing" className={fieldClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Years experience</label>
            <input name="years_experience" type="number" min={0} value={business.years_experience} onChange={onBusinessChange} placeholder="5" className={fieldClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Bio (optional)</label>
            <textarea name="bio" value={business.bio} onChange={onBusinessChange} rows={2} placeholder="Short description of your work" className={fieldClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Street address</label>
            <input name="line1" value={business.line1} onChange={onBusinessChange} placeholder="123 Example Street" className={fieldClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-black mb-1.5">Suburb</label>
              <input name="suburb" value={business.suburb} onChange={onBusinessChange} className={fieldClass} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-black mb-1.5">City</label>
              <input name="city" value={business.city} onChange={onBusinessChange} className={fieldClass} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Province</label>
            <input name="province" value={business.province} onChange={onBusinessChange} placeholder="Gauteng" className={fieldClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black mb-1.5">Service area pin</label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <input name="latitude" value={business.latitude} onChange={onBusinessChange} placeholder="Latitude" className={fieldClass} />
              <input name="longitude" value={business.longitude} onChange={onBusinessChange} placeholder="Longitude" className={fieldClass} />
            </div>
            <Button type="button" variant="outline" className="w-full" onClick={useMyLocation}>
              <MapPin className="w-4 h-4" /> Use my location
            </Button>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={loading}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ChevronRight className="w-4 h-4" /></>}
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={submitStep3} className="space-y-3">
          <p className="text-sm text-[#6b6b6b]">Select the services you offer.</p>
          <div className="max-h-64 overflow-y-auto space-y-2 border border-black/5 rounded-xl p-3">
            {skillsCatalog.length === 0 && (
              <p className="text-sm text-[#9a9a9a]">Loading skills...</p>
            )}
            {skillsCatalog.map((s) => {
              const on = selectedSkillIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSkill(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                    on
                      ? 'bg-black text-white border-black'
                      : 'bg-[#f6f6f6] text-black border-black/5 hover:border-black/20'
                  }`}
                >
                  {s.name}
                  {s.category ? (
                    <span className={`ml-2 text-xs ${on ? 'text-white/70' : 'text-[#9a9a9a]'}`}>
                      {s.category}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)} disabled={loading}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ChevronRight className="w-4 h-4" /></>}
            </Button>
          </div>
        </form>
      )}

      {step === 4 && (
        <form onSubmit={submitStep4} className="space-y-3">
          <div className="flex gap-2">
            {(['cash', 'bank'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPayout({ ...payout, method_type: t })}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border ${
                  payout.method_type === t
                    ? 'bg-black text-white border-black'
                    : 'bg-[#f6f6f6] text-black border-black/10'
                }`}
              >
                {t === 'cash' ? 'Cash' : 'Bank transfer'}
              </button>
            ))}
          </div>
          {payout.method_type === 'bank' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-black mb-1.5">Bank name</label>
                <input name="bank_name" value={payout.bank_name} onChange={onPayoutChange} placeholder="FNB" className={fieldClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-1.5">Account holder</label>
                <input name="account_holder" value={payout.account_holder} onChange={onPayoutChange} className={fieldClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-black mb-1.5">Account number</label>
                <input name="account_number" value={payout.account_number} onChange={onPayoutChange} className={fieldClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-black mb-1.5">Branch code</label>
                  <input name="branch_code" value={payout.branch_code} onChange={onPayoutChange} className={fieldClass} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-black mb-1.5">Account type</label>
                  <select name="account_type" value={payout.account_type} onChange={onPayoutChange} className={fieldClass}>
                    <option value="cheque">Cheque</option>
                    <option value="savings">Savings</option>
                    <option value="transmission">Transmission</option>
                  </select>
                </div>
              </div>
            </>
          )}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(3)} disabled={loading}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit for review'}
            </Button>
          </div>
        </form>
      )}

      {step === 5 && (
        <div className="text-center space-y-4 py-4">
          <div className="mx-auto w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
            <Check className="w-7 h-7 text-[#0e8345]" />
          </div>
          <p className="text-black font-semibold text-lg">Submitted for review</p>
          <p className="text-sm text-[#6b6b6b]">
            An admin will activate your account after checking your profile. You can log in, but you cannot take jobs until activated.
          </p>
          <Button className="w-full" size="lg" onClick={() => navigate('/login-sp')}>
            Continue to login
          </Button>
        </div>
      )}
    </AuthCard>
  );
}
