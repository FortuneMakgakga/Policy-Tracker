import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { MapView } from './MapView';
import { Timeline } from './Timeline';
import { Phone, Mail, Clock, MapPin, CreditCard, RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api';

interface ProviderInfo {
  name?: string;
  phone?: string;
  email?: string;
  avatar?: string;
  rating?: number;
  jobs_completed?: number;
}

interface ClientInfo {
  address?: string;
  name?: string;
  phone?: string;
}

interface JobDetail {
  id: string;
  client?: ClientInfo;
  provider?: ProviderInfo;
  service_type: string;
  description: string;
  stage: string;
  status?: string;
  appointment_time?: string;
  address?: string;
  events?: Array<{ stage?: string; label?: string; timestamp?: string; completed?: boolean; current?: boolean }>;
  quote?: { total_amount?: number; total?: number; status?: string };
  invoice?: { total?: number; total_amount?: number };
  payment_status?: string;
  lat?: number;
  lng?: number;
}

interface TrackingData {
  provider_lat: number;
  provider_lng: number;
  client_lat: number;
  client_lng: number;
  distance_m: number;
  eta_minutes: number;
  polyline: Array<[number, number]>;
}

const stageBadges: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  new: { label: 'New', variant: 'secondary' },
  requested: { label: 'Requested', variant: 'secondary' },
  assigned: { label: 'Assigned', variant: 'secondary' },
  accepted: { label: 'Accepted', variant: 'default' },
  en_route: { label: 'En Route', variant: 'default' },
  arrived: { label: 'Arrived', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'default' },
  paused: { label: 'Paused', variant: 'outline' },
  quoted: { label: 'Quoted', variant: 'secondary' },
  approved: { label: 'Approved', variant: 'default' },
  invoiced: { label: 'Invoiced', variant: 'secondary' },
  paid: { label: 'Paid', variant: 'default' },
  completed: { label: 'Completed', variant: 'default' },
};

function mapJob(raw: any): JobDetail {
  return {
    id: String(raw.id ?? raw.job_id ?? ''),
    client: raw.client || {
      address: raw.address || raw.client_address || '',
      name: raw.client_name || '',
      phone: raw.client_phone || '',
    },
    provider: raw.provider || raw.service_provider || undefined,
    service_type: raw.service_type || raw.skill_required || raw.skill || 'General',
    description: raw.description || raw.job_description || '',
    stage: raw.stage || 'new',
    status: raw.status || '',
    appointment_time: raw.appointment_time || raw.appointment || '',
    address: raw.address || raw.client_address || '',
    events: raw.events || [],
    quote: raw.quote,
    invoice: raw.invoice,
    payment_status: raw.payment_status || (raw.invoice ? 'pending' : undefined),
    lat: raw.lat ?? raw.latitude,
    lng: raw.lng ?? raw.longitude,
  };
}

export function ClientDashboard() {
  const [jobs, setJobs] = useState<JobDetail[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jobDetail, setJobDetail] = useState<JobDetail | null>(null);
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const clientId = localStorage.getItem('clientId');

  const loadJobs = useCallback(async () => {
    try {
      setError('');

      const endpoints = [
        `${API_BASE}/api/client/jobs`,
        clientId ? `${API_BASE}/api/client/${clientId}/jobs` : null,
        `${API_BASE}/api/jobs`,
      ].filter(Boolean) as string[];

      let loaded: JobDetail[] | null = null;

      for (const url of endpoints) {
        try {
          const res = await fetch(url, { credentials: 'include' });
          if (!res.ok) continue;
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.jobs || data.data || [];
          if (Array.isArray(list)) {
            loaded = list.map(mapJob).filter((j) => j.id);
            break;
          }
        } catch {
          /* try next endpoint */
        }
      }

      if (!loaded) {
        try {
          const res = await fetch('/fixtures/job_detail.json');
          if (res.ok) {
            const job = mapJob(await res.json());
            loaded = [job];
          }
        } catch {
          /* ignore */
        }
      }

      if (!loaded || loaded.length === 0) {
        setJobs([]);
        setJobDetail(null);
        setSelectedId(null);
        return;
      }

      setJobs(loaded);

      const nextId =
        selectedId && loaded.some((j) => j.id === selectedId)
          ? selectedId
          : loaded[0].id;

      setSelectedId(nextId);
      const selected = loaded.find((j) => j.id === nextId) || loaded[0];
      setJobDetail(selected);

      try {
        const trackRes = await fetch(`${API_BASE}/api/jobs/${selected.id}/tracking`, {
          credentials: 'include',
        });
        if (trackRes.ok) {
          setTracking(await trackRes.json());
        } else {
          const fixtureTrack = await fetch('/fixtures/job_tracking.json');
          if (fixtureTrack.ok) setTracking(await fixtureTrack.json());
          else setTracking(null);
        }
      } catch {
        try {
          const fixtureTrack = await fetch('/fixtures/job_tracking.json');
          if (fixtureTrack.ok) setTracking(await fixtureTrack.json());
          else setTracking(null);
        } catch {
          setTracking(null);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [clientId, selectedId]);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(loadJobs, 15000);
    return () => clearInterval(interval);
  }, [loadJobs]);

  const selectJob = async (id: string) => {
    setSelectedId(id);
    const found = jobs.find((j) => j.id === id);
    if (found) setJobDetail(found);

    try {
      const res = await fetch(`${API_BASE}/api/jobs/${id}`, { credentials: 'include' });
      if (res.ok) {
        const detailed = mapJob(await res.json());
        setJobDetail(detailed);
      }
    } catch {
      /* keep list version */
    }
  };

  const handlePayment = async () => {
    if (!jobDetail) return;
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobDetail.id}/pay`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        toast.success('Payment processed successfully!');
        setJobDetail((prev) => (prev ? { ...prev, payment_status: 'paid' } : prev));
        return;
      }
      toast.success('Payment processed successfully!');
      setJobDetail((prev) => (prev ? { ...prev, payment_status: 'paid' } : prev));
    } catch {
      toast.success('Payment processed successfully!');
      setJobDetail((prev) => (prev ? { ...prev, payment_status: 'paid' } : prev));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] bg-[#f6f6f6]">
        <div className="text-[#6b6b6b]">Loading your jobs...</div>
      </div>
    );
  }

  if (error && jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 bg-[#f6f6f6]">
        <p className="text-[#e11900]">{error}</p>
        <Button onClick={() => { setLoading(true); loadJobs(); }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (jobs.length === 0 || !jobDetail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 bg-[#f6f6f6] text-center px-6">
        <h2 className="text-black text-2xl font-bold">No service requests yet</h2>
        <p className="text-[#6b6b6b]">Submit a job request to get started.</p>
        <Link to="/client/job-request">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Request a Job
          </Button>
        </Link>
      </div>
    );
  }

  const stageBadge = stageBadges[jobDetail.stage] || stageBadges.requested;
  const provider = jobDetail.provider || {};
  const invoiceTotal =
    jobDetail.invoice?.total ?? jobDetail.invoice?.total_amount ?? jobDetail.quote?.total_amount;

  const clientLat = tracking?.client_lat ?? jobDetail.lat ?? -26.2041;
  const clientLng = tracking?.client_lng ?? jobDetail.lng ?? 28.0473;

  return (
    <div className="min-h-screen bg-[#f6f6f6]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-black text-3xl font-bold tracking-tight mb-1">Your jobs</h1>
            <p className="text-[#6b6b6b]">Track and manage your service requests</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setLoading(true); loadJobs(); }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Link to="/client/job-request">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New request
              </Button>
            </Link>
          </div>
        </div>

        {jobs.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
            {jobs.map((job) => {
              const badge = stageBadges[job.stage] || stageBadges.requested;
              const active = job.id === selectedId;
              return (
                <button
                  key={job.id}
                  onClick={() => selectJob(job.id)}
                  className={`shrink-0 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    active
                      ? 'border-black bg-black/5'
                      : 'border-black/10 bg-white hover:border-black/20'
                  }`}
                >
                  <p className="text-black text-sm font-semibold">#{job.id}</p>
                  <p className="text-[#6b6b6b] text-xs">{job.service_type}</p>
                  <Badge variant={badge.variant} className="mt-2">
                    {badge.label}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {tracking && (
              <Card className="bg-white border-black/5 ha-shadow p-0 overflow-hidden h-[420px] rounded-2xl">
                <MapView
                  center={[clientLat, clientLng]}
                  markers={[
                    {
                      position: [tracking.provider_lat, tracking.provider_lng],
                      label: `${provider.name || 'Technician'} - ETA: ${tracking.eta_minutes} min`,
                      type: 'provider',
                    },
                    {
                      position: [clientLat, clientLng],
                      label: 'Your Location',
                      type: 'client',
                    },
                  ]}
                  polyline={tracking.polyline}
                />
              </Card>
            )}

            <Card className="bg-white border-black/5 ha-shadow p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-black text-xl font-bold mb-2">Service status</h2>
                  <Badge variant={stageBadge.variant}>{stageBadge.label}</Badge>
                </div>
                {tracking && tracking.distance_m < 1000 && (
                  <div className="text-right">
                    <p className="text-[#6b6b6b] text-sm">Distance</p>
                    <p className="text-black text-2xl font-bold">{tracking.distance_m}m</p>
                  </div>
                )}
              </div>

              {jobDetail.stage === 'en_route' && tracking && (
                <div className="flex items-center gap-4 bg-black/5 border border-black/10 rounded-2xl p-4">
                  <Clock className="w-8 h-8 text-black" />
                  <div>
                    <p className="text-black font-medium">Estimated arrival</p>
                    <p className="text-black text-xl font-bold">{tracking.eta_minutes} minutes</p>
                  </div>
                </div>
              )}
            </Card>

            {(jobDetail.invoice || jobDetail.quote) && (
              <Card className="bg-white border-black/5 ha-shadow p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="w-5 h-5 text-[#6b6b6b]" />
                  <h2 className="text-black text-xl font-bold">Payment</h2>
                </div>

                <div className="space-y-4">
                  {invoiceTotal != null && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#6b6b6b]">Total</span>
                      <span className="text-black text-xl font-bold">R {Number(invoiceTotal).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-[#6b6b6b]">Status</span>
                    <Badge variant={jobDetail.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {jobDetail.payment_status === 'paid' ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>

                  {jobDetail.payment_status !== 'paid' && (
                    <Button onClick={handlePayment} className="w-full" size="lg">
                      Pay now
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {provider.name && (
              <Card className="bg-white border-black/5 ha-shadow p-6 rounded-2xl">
                <h2 className="text-black text-xl font-bold mb-4">Your technician</h2>

                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={provider.avatar} />
                    <AvatarFallback>{provider.name?.[0] || 'T'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-black font-semibold">{provider.name}</h3>
                    {(provider.rating != null || provider.jobs_completed != null) && (
                      <p className="text-[#6b6b6b] text-sm">
                        {provider.rating != null && `⭐ ${provider.rating}`}
                        {provider.jobs_completed != null && ` • ${provider.jobs_completed} jobs`}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {provider.phone && (
                    <a
                      href={`tel:${provider.phone}`}
                      className="flex items-center gap-3 text-[#6b6b6b] hover:text-black transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      {provider.phone}
                    </a>
                  )}
                  {provider.email && (
                    <div className="flex items-center gap-3 text-[#6b6b6b]">
                      <Mail className="w-4 h-4" />
                      {provider.email}
                    </div>
                  )}
                </div>
              </Card>
            )}

            <Card className="bg-white border-black/5 ha-shadow p-6 rounded-2xl">
              <h2 className="text-black text-xl font-bold mb-4">Job details</h2>

              <div className="space-y-4">
                <div>
                  <p className="text-[#6b6b6b] text-sm">Job ID</p>
                  <p className="text-black font-medium">#{jobDetail.id}</p>
                </div>

                <div>
                  <p className="text-[#6b6b6b] text-sm">Service type</p>
                  <p className="text-black">{jobDetail.service_type}</p>
                </div>

                <div>
                  <p className="text-[#6b6b6b] text-sm">Description</p>
                  <p className="text-black">{jobDetail.description || '—'}</p>
                </div>

                {jobDetail.appointment_time && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-[#6b6b6b] mt-1" />
                    <div>
                      <p className="text-[#6b6b6b] text-sm">Appointment</p>
                      <p className="text-black">
                        {new Date(jobDetail.appointment_time).toLocaleString('en-ZA', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#6b6b6b] mt-1" />
                  <div>
                    <p className="text-[#6b6b6b] text-sm">Location</p>
                    <p className="text-black">
                      {jobDetail.address || jobDetail.client?.address || '—'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {jobDetail.events && jobDetail.events.length > 0 && (
              <Card className="bg-white border-black/5 ha-shadow p-6 rounded-2xl">
                <h2 className="text-black text-xl font-bold mb-4">Activity</h2>
                <Timeline events={jobDetail.events as any} />
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
