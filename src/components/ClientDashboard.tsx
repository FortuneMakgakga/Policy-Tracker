import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { MapView } from './MapView';
import { Timeline } from './Timeline';
import { Phone, Mail, Clock, MapPin, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface JobDetail {
  id: string;
  client: any;
  provider: any;
  service_type: string;
  description: string;
  stage: string;
  appointment_time: string;
  events: any[];
  quote: any;
  invoice: any;
  payment_status: string;
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

const stageBadges: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
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

export function ClientDashboard() {
  const [jobDetail, setJobDetail] = useState<JobDetail | null>(null);
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    Promise.all([
      fetch('/fixtures/job_detail.json').then(r => r.json()),
      fetch('/fixtures/job_tracking.json').then(r => r.json()),
    ]).then(([job, track]) => {
      setJobDetail(job);
      setTracking(track);
      setLoading(false);
    });

    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      Promise.all([
        fetch('/fixtures/job_detail.json').then(r => r.json()),
        fetch('/fixtures/job_tracking.json').then(r => r.json()),
      ]).then(([job, track]) => {
        setJobDetail(job);
        setTracking(track);
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handlePayment = () => {
    toast.success('Payment processed successfully!');
  };

  if (loading || !jobDetail || !tracking) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const stageBadge = stageBadges[jobDetail.stage] || stageBadges.requested;

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-white text-3xl mb-2">Track Your Service</h1>
          <p className="text-gray-400">Job ID: {jobDetail.id}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Map */}
            <Card className="bg-gray-900 border-gray-800 p-0 overflow-hidden h-[500px]">
              <MapView
                center={[tracking.client_lat, tracking.client_lng]}
                markers={[
                  {
                    position: [tracking.provider_lat, tracking.provider_lng],
                    label: `${jobDetail.provider.name} - ETA: ${tracking.eta_minutes} min`,
                    type: 'provider',
                  },
                  {
                    position: [tracking.client_lat, tracking.client_lng],
                    label: 'Your Location',
                    type: 'client',
                  },
                ]}
                polyline={tracking.polyline}
              />
            </Card>

            {/* Status and ETA */}
            <Card className="bg-gray-900 border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-white text-xl mb-2">Service Status</h2>
                  <Badge variant={stageBadge.variant}>{stageBadge.label}</Badge>
                </div>
                {tracking.distance_m < 1000 && (
                  <div className="text-right">
                    <p className="text-gray-400 text-sm">Distance</p>
                    <p className="text-white text-2xl">{tracking.distance_m}m</p>
                  </div>
                )}
              </div>

              {jobDetail.stage === 'en_route' && (
                <div className="flex items-center gap-4 bg-blue-950 border border-blue-900 rounded-lg p-4">
                  <Clock className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-blue-400">Estimated Arrival</p>
                    <p className="text-white text-xl">{tracking.eta_minutes} minutes</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Payment */}
            {jobDetail.invoice && (
              <Card className="bg-gray-900 border-gray-800 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <h2 className="text-white text-xl">Payment</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Invoice Total</span>
                    <span className="text-white text-xl">R {jobDetail.invoice.total.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Status</span>
                    <Badge variant={jobDetail.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {jobDetail.payment_status === 'paid' ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>

                  {jobDetail.payment_status === 'pending' && (
                    <Button onClick={handlePayment} className="w-full">
                      Pay Now
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Provider Info */}
            <Card className="bg-gray-900 border-gray-800 p-6">
              <h2 className="text-white text-xl mb-4">Your Technician</h2>

              <div className="flex items-center gap-4 mb-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={jobDetail.provider.avatar} />
                  <AvatarFallback>{jobDetail.provider.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-white">{jobDetail.provider.name}</h3>
                  <p className="text-gray-400 text-sm">
                    ⭐ {jobDetail.provider.rating} • {jobDetail.provider.jobs_completed} jobs
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <a
                  href={`tel:${jobDetail.provider.phone}`}
                  className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {jobDetail.provider.phone}
                </a>
                <div className="flex items-center gap-3 text-gray-400">
                  <Mail className="w-4 h-4" />
                  {jobDetail.provider.email}
                </div>
              </div>
            </Card>

            {/* Job Details */}
            <Card className="bg-gray-900 border-gray-800 p-6">
              <h2 className="text-white text-xl mb-4">Job Details</h2>

              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm">Service Type</p>
                  <p className="text-white">{jobDetail.service_type}</p>
                </div>

                <div>
                  <p className="text-gray-400 text-sm">Description</p>
                  <p className="text-white">{jobDetail.description}</p>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-gray-400 text-sm">Appointment</p>
                    <p className="text-white">
                      {new Date(jobDetail.appointment_time).toLocaleString('en-ZA', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                  <div>
                    <p className="text-gray-400 text-sm">Location</p>
                    <p className="text-white">{jobDetail.client.address}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Timeline */}
            <Card className="bg-gray-900 border-gray-800 p-6">
              <h2 className="text-white text-xl mb-4">Activity Timeline</h2>
              <Timeline events={jobDetail.events} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
