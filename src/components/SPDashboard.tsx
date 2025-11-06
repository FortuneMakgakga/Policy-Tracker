import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MapView } from './MapView';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Clock, MapPin, Phone, Navigation, Pause, Play, X } from 'lucide-react';
import { toast } from 'sonner';

interface Job {
  id: string;
  client_name: string;
  client_phone: string;
  service_type: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  distance_km: number;
  appointment_time: string;
  stage?: string;
  priority?: string;
}

interface JobContextCardProps {
  job: Job;
  onAccept: () => void;
  onDecline: () => void;
  onStartRoute: () => void;
  onPause: () => void;
  onResume: () => void;
}

function JobContextCard({ job, onAccept, onDecline, onStartRoute, onPause, onResume }: JobContextCardProps) {
  const isActive = job.stage && ['accepted', 'en_route', 'arrived', 'in_progress'].includes(job.stage);
  const canAccept = !job.stage || job.stage === 'assigned';
  const canStartRoute = job.stage === 'accepted';
  const canPause = job.stage === 'in_progress';
  const isPaused = job.stage === 'paused';

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white text-xl mb-1">{job.client_name}</h3>
          <Badge variant={job.priority === 'high' ? 'destructive' : 'secondary'}>
            {job.service_type}
          </Badge>
        </div>
        {job.stage && (
          <Badge>{job.stage.replace('_', ' ').toUpperCase()}</Badge>
        )}
      </div>

      <div className="space-y-3 mb-4">
        <p className="text-gray-300">{job.description}</p>

        <div className="flex items-center gap-2 text-gray-400">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">{job.address}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-400">
          <Phone className="w-4 h-4" />
          <span className="text-sm">{job.client_phone}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm">
            {new Date(job.appointment_time).toLocaleString('en-ZA', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <div className="text-gray-400 text-sm">
          Distance: <span className="text-white">{job.distance_km} km</span>
        </div>
      </div>

      <div className="flex gap-2">
        {canAccept && (
          <>
            <Button onClick={onAccept} className="flex-1">
              Accept
            </Button>
            <Button onClick={onDecline} variant="outline" className="flex-1">
              Decline
            </Button>
          </>
        )}

        {canStartRoute && (
          <Button onClick={onStartRoute} className="flex-1">
            <Navigation className="w-4 h-4 mr-2" />
            Start Route
          </Button>
        )}

        {canPause && (
          <Button onClick={onPause} variant="outline" className="flex-1">
            <Pause className="w-4 h-4 mr-2" />
            Pause Job
          </Button>
        )}

        {isPaused && (
          <Button onClick={onResume} className="flex-1">
            <Play className="w-4 h-4 mr-2" />
            Resume Job
          </Button>
        )}
      </div>
    </Card>
  );
}

export function SPDashboard() {
  const [incomingJobs, setIncomingJobs] = useState<Job[]>([]);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [notificationJob, setNotificationJob] = useState<Job | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  useEffect(() => {
    // Initial load
    Promise.all([
      fetch('/fixtures/incoming_jobs.json').then(r => r.json()),
      fetch('/fixtures/sp_active_jobs.json').then(r => r.json()),
    ]).then(([incoming, active]) => {
      setIncomingJobs(incoming);
      setActiveJobs(active);
    });

    // Poll for new jobs every 10 seconds
    const interval = setInterval(() => {
      fetch('/fixtures/incoming_jobs.json')
        .then(r => r.json())
        .then(incoming => {
          // Check for new jobs
          const newJob = incoming.find((job: Job) => 
            !incomingJobs.some(existing => existing.id === job.id)
          );

          if (newJob) {
            toast.info(`New ${newJob.service_type} job available`);
            setNotificationJob(newJob);
            setShowNotificationModal(true);
          }

          setIncomingJobs(incoming);
        });

      fetch('/fixtures/sp_active_jobs.json')
        .then(r => r.json())
        .then(setActiveJobs);
    }, 10000);

    return () => clearInterval(interval);
  }, [incomingJobs]);

  const handleAcceptJob = (job: Job) => {
    toast.success(`Job ${job.id} accepted`);
    setIncomingJobs(prev => prev.filter(j => j.id !== job.id));
    setActiveJobs(prev => [...prev, { ...job, stage: 'accepted' }]);
    setShowNotificationModal(false);
    setNotificationJob(null);
  };

  const handleDeclineJob = (job: Job) => {
    toast.info(`Job ${job.id} declined`);
    setIncomingJobs(prev => prev.filter(j => j.id !== job.id));
    setShowNotificationModal(false);
    setNotificationJob(null);
  };

  const handleStartRoute = (job: Job) => {
    toast.success('Route started');
    setActiveJobs(prev => 
      prev.map(j => j.id === job.id ? { ...j, stage: 'en_route' } : j)
    );
  };

  const handlePause = (job: Job) => {
    toast.info('Job paused');
    setActiveJobs(prev => 
      prev.map(j => j.id === job.id ? { ...j, stage: 'paused' } : j)
    );
  };

  const handleResume = (job: Job) => {
    toast.success('Job resumed');
    setActiveJobs(prev => 
      prev.map(j => j.id === job.id ? { ...j, stage: 'in_progress' } : j)
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left Panel - Notifications */}
      <div className="w-96 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-white text-xl">Incoming Jobs</h2>
          <p className="text-gray-400 text-sm mt-1">{incomingJobs.length} available</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {incomingJobs.map(job => (
              <Card
                key={job.id}
                className="bg-gray-800 border-gray-700 p-4 cursor-pointer hover:bg-gray-750 transition-colors"
                onClick={() => setSelectedJob(job)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white">{job.client_name}</h3>
                  {job.priority === 'high' && (
                    <Badge variant="destructive">Urgent</Badge>
                  )}
                </div>

                <Badge variant="secondary" className="mb-2">
                  {job.service_type}
                </Badge>

                <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                  {job.description}
                </p>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{job.distance_km} km away</span>
                  <span className="text-gray-400">
                    {new Date(job.appointment_time).toLocaleTimeString('en-ZA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </Card>
            ))}

            {incomingJobs.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                No incoming jobs
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Map */}
      <div className="flex-1 relative">
        <MapView
          center={[-26.1234, 28.0456]}
          zoom={12}
          markers={activeJobs.map(job => ({
            position: [job.lat, job.lng],
            label: `${job.client_name} - ${job.service_type}`,
            type: 'job' as const,
            onClick: () => setSelectedJob(job),
          }))}
        />

        {/* Job Context Card Overlay */}
        {selectedJob && (
          <div className="absolute top-6 left-6 right-6 max-w-md">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 bg-gray-900 hover:bg-gray-800 rounded-full z-10"
                onClick={() => setSelectedJob(null)}
              >
                <X className="w-4 h-4" />
              </Button>
              <JobContextCard
                job={selectedJob}
                onAccept={() => handleAcceptJob(selectedJob)}
                onDecline={() => handleDeclineJob(selectedJob)}
                onStartRoute={() => handleStartRoute(selectedJob)}
                onPause={() => handlePause(selectedJob)}
                onResume={() => handleResume(selectedJob)}
              />
            </div>
          </div>
        )}

        {/* Active Jobs Counter */}
        <div className="absolute bottom-6 left-6">
          <Card className="bg-gray-900 border-gray-800 p-4">
            <p className="text-gray-400 text-sm">Active Jobs</p>
            <p className="text-white text-2xl">{activeJobs.length}</p>
          </Card>
        </div>
      </div>

      {/* Notification Modal */}
      <Dialog open={showNotificationModal} onOpenChange={setShowNotificationModal}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">New Job Request</DialogTitle>
            <DialogDescription className="text-gray-400">
              A new job is available in your area
            </DialogDescription>
          </DialogHeader>

          {notificationJob && (
            <div className="space-y-3 py-4">
              <div>
                <p className="text-gray-400 text-sm">Client</p>
                <p className="text-white">{notificationJob.client_name}</p>
              </div>

              <div>
                <p className="text-gray-400 text-sm">Service Type</p>
                <Badge>{notificationJob.service_type}</Badge>
              </div>

              <div>
                <p className="text-gray-400 text-sm">Description</p>
                <p className="text-white">{notificationJob.description}</p>
              </div>

              <div>
                <p className="text-gray-400 text-sm">Location</p>
                <p className="text-white text-sm">{notificationJob.address}</p>
              </div>

              <div className="flex justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Distance</p>
                  <p className="text-white">{notificationJob.distance_km} km</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Time</p>
                  <p className="text-white">
                    {new Date(notificationJob.appointment_time).toLocaleTimeString('en-ZA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => notificationJob && handleDeclineJob(notificationJob)}
            >
              Decline
            </Button>
            <Button onClick={() => notificationJob && handleAcceptJob(notificationJob)}>
              Accept Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
