import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { MapView } from "./MapView";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Clock, MapPin, Phone, Navigation, X } from "lucide-react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

const API_BASE = "https://opulent-happiness-7xvg5xp75vq3p95r-5000.app.github.dev";

interface BackendJob {
  id?: string;
  job_id?: number;
  client_name?: string;
  clientName?: string;
  client_phone?: string;
  service_type?: string;
  skill_required?: string;
  skill?: string;
  description?: string;
  job_description?: string;
  jobDesc?: string;
  address?: string;
  client_address?: string;
  province?: string;
  lat?: number | null;
  lng?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  appointment_time?: string | null;
  appointment?: string | null;
  stage?: string;
  priority?: string;
  status?: string;
  assigned_sp_id?: number | null;
}

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
  status?: string;
  assigned_sp_id?: number | null;
}

interface JobContextCardProps {
  job: Job;
  onAccept: () => void;
  onDecline: () => void;
  onOpenJob: () => void;
}

function JobContextCard({
  job,
  onAccept,
  onDecline,
  onOpenJob,
}: JobContextCardProps) {
  const canAccept = !job.stage || job.stage === "new" || job.stage === "assigned";
  const isActive =
    !!job.stage &&
    ["accepted", "arrived", "in_progress", "paused", "quoted", "approved"].includes(
      job.stage
    );

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white text-xl mb-1">{job.client_name}</h3>
          <Badge variant={job.priority === "high" ? "destructive" : "secondary"}>
            {job.service_type}
          </Badge>
        </div>
        {job.stage && <Badge>{job.stage.replace("_", " ").toUpperCase()}</Badge>}
      </div>

      <div className="space-y-3 mb-4">
        <p className="text-gray-300">{job.description}</p>

        <div className="flex items-center gap-2 text-gray-400">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">{job.address || "No address provided"}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-400">
          <Phone className="w-4 h-4" />
          <span className="text-sm">{job.client_phone || "No phone"}</span>
        </div>

        <div className="flex items-center gap-2 text-gray-400">
          <Clock className="w-4 h-4" />
          <span className="text-sm">
            {job.appointment_time
              ? new Date(job.appointment_time).toLocaleString("en-ZA", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "No appointment"}
          </span>
        </div>

        <div className="text-gray-400 text-sm">
          Distance: <span className="text-white">{job.distance_km.toFixed(1)} km</span>
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

        {isActive && (
          <Button onClick={onOpenJob} className="flex-1">
            <Navigation className="w-4 h-4 mr-2" />
            Open Job
          </Button>
        )}
      </div>
    </Card>
  );
}

function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function mapBackendJobToUi(job: BackendJob, spLat?: number, spLng?: number): Job {
  const rawLat = job.lat ?? job.latitude ?? 0;
  const rawLng = job.lng ?? job.longitude ?? 0;
  const lat = Number(rawLat || 0);
  const lng = Number(rawLng || 0);

  const distance_km =
    spLat != null && spLng != null && lat && lng
      ? calculateDistanceKm(spLat, spLng, lat, lng)
      : 0;

  return {
    id: String(job.id ?? job.job_id ?? ""),
    client_name: job.client_name || job.clientName || "Unknown Client",
    client_phone: job.client_phone || "",
    service_type: job.service_type || job.skill_required || job.skill || "General",
    description: job.description || job.job_description || job.jobDesc || "",
    address: job.address || job.client_address || job.province || "Location unavailable",
    lat,
    lng,
    distance_km,
    appointment_time:
      job.appointment_time || job.appointment || new Date().toISOString(),
    stage: job.stage,
    priority: job.priority || "normal",
    status: job.status,
    assigned_sp_id: job.assigned_sp_id ?? null,
  };
}

function upsertJob(list: Job[], updated: Job) {
  const exists = list.some((job) => job.id === updated.id);
  if (exists) {
    return list.map((job) => (job.id === updated.id ? updated : job));
  }
  return [updated, ...list];
}

export function SPDashboard() {
  const navigate = useNavigate();

  const [incomingJobs, setIncomingJobs] = useState<Job[]>([]);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [notificationJob, setNotificationJob] = useState<Job | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const spId = localStorage.getItem("spId");

  const spLat = useMemo(() => {
    const v = localStorage.getItem("spLat");
    return v ? Number(v) : undefined;
  }, []);

  const spLng = useMemo(() => {
    const v = localStorage.getItem("spLng");
    return v ? Number(v) : undefined;
  }, []);

  const splitJobs = (jobs: Job[]) => {
    const incoming = jobs.filter(
      (job) => !job.stage || job.stage === "new" || job.stage === "assigned"
    );

    const active = jobs.filter(
      (job) =>
        !!job.stage &&
        ["accepted", "arrived", "in_progress", "paused", "quoted", "approved"].includes(
          job.stage
        )
    );

    return { incoming, active };
  };

  useEffect(() => {
    let socket: Socket | null = null;

    const loadJobs = async () => {
      try {
        setLoading(true);

        const [openRes, spJobsRes] = await Promise.all([
          fetch(`${API_BASE}/api/jobs/open`, {
            method: "GET",
            credentials: "include",
          }),
          fetch(`${API_BASE}/api/sp/jobs`, {
            method: "GET",
            credentials: "include",
          }),
        ]);

        const openData = await openRes.json();
        const spJobsData = await spJobsRes.json();

        if (!openRes.ok) {
          toast.error(openData.error || "Failed to load open jobs");
          return;
        }

        if (!spJobsRes.ok) {
          toast.error(spJobsData.error || "Failed to load assigned jobs");
          return;
        }

        const allMapped = [
          ...(openData as BackendJob[]).map((job) => mapBackendJobToUi(job, spLat, spLng)),
          ...(spJobsData as BackendJob[]).map((job) => mapBackendJobToUi(job, spLat, spLng)),
        ];

        const deduped = Array.from(
          new Map(allMapped.map((job) => [job.id, job])).values()
        );

        const { incoming, active } = splitJobs(deduped);
        setIncomingJobs(incoming);
        setActiveJobs(active);
      } catch {
        toast.error("Could not connect to server");
      } finally {
        setLoading(false);
      }
    };

    loadJobs();

    socket = io(API_BASE, {
      withCredentials: true,
      transports: ["polling"],
    });

    socket.on("connect", () => {
      if (spId) {
        socket?.emit("join_room", { sp_id: spId });
      }
    });

    socket.on("receive_notification", (job: BackendJob) => {
      const mapped = mapBackendJobToUi(job, spLat, spLng);

      setIncomingJobs((prev) => upsertJob(prev, mapped));
      toast.info(`New ${mapped.service_type} job available`);
      setNotificationJob(mapped);
      setShowNotificationModal(true);
    });

    socket.on("job_assigned", (job: BackendJob) => {
      const mapped = mapBackendJobToUi(job, spLat, spLng);
      setIncomingJobs((prev) => upsertJob(prev, mapped));
      toast.success(`New assigned ${mapped.service_type} job`);
    });

    socket.on("job_updated", (job: BackendJob) => {
      const mapped = mapBackendJobToUi(job, spLat, spLng);
      const stage = mapped.stage || "";

      if (stage === "completed" || stage === "invoiced" || mapped.status === "Completed") {
        setIncomingJobs((prev) => prev.filter((j) => j.id !== mapped.id));
        setActiveJobs((prev) => prev.filter((j) => j.id !== mapped.id));
        setSelectedJob((prev) => (prev?.id === mapped.id ? null : prev));
        return;
      }

      const { incoming, active } = splitJobs([
        ...incomingJobs.filter((j) => j.id !== mapped.id),
        ...activeJobs.filter((j) => j.id !== mapped.id),
        mapped,
      ]);

      setIncomingJobs(incoming);
      setActiveJobs(active);
      setSelectedJob((prev) => (prev?.id === mapped.id ? mapped : prev));
    });

    socket.on("job_taken", ({ job_id }: { job_id: number }) => {
      const id = String(job_id);
      setIncomingJobs((prev) => prev.filter((job) => job.id !== id));
      setSelectedJob((prev) => (prev?.id === id ? null : prev));
    });

    socket.on("job_declined", ({ job_id }: { job_id: number }) => {
      const id = String(job_id);
      setIncomingJobs((prev) => prev.filter((job) => job.id !== id));
      setSelectedJob((prev) => (prev?.id === id ? null : prev));
    });

    socket.on("job_cancelled", ({ job_id }: { job_id: number }) => {
      const id = String(job_id);
      setIncomingJobs((prev) => prev.filter((job) => job.id !== id));
      setActiveJobs((prev) => prev.filter((job) => job.id !== id));
      setSelectedJob((prev) => (prev?.id === id ? null : prev));
      toast.info(`Job ${job_id} was cancelled`);
    });

    return () => {
      socket?.disconnect();
    };
  }, [spId, spLat, spLng]);

  const handleAcceptJob = async (job: Job) => {
    if (!spId) {
      toast.error("Missing service provider ID");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/jobs/${job.id}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          sp_id: Number(spId),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to accept job");
        return;
      }

      const updatedJob = data.job
        ? mapBackendJobToUi(data.job, spLat, spLng)
        : { ...job, stage: "accepted", status: "Active" };

      setIncomingJobs((prev) => prev.filter((j) => j.id !== job.id));
      setActiveJobs((prev) => upsertJob(prev, updatedJob));
      setSelectedJob((prev) => (prev?.id === job.id ? updatedJob : prev));
      setShowNotificationModal(false);
      setNotificationJob(null);

      toast.success(`Job ${job.id} accepted`);
      navigate(`/sp/jobs/${job.id}`);
    } catch {
      toast.error("Could not connect to server");
    }
  };

  const handleDeclineJob = async (job: Job) => {
    if (!spId) {
      toast.error("Missing service provider ID");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/decline_job`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          job_id: Number(job.id),
          sp_id: Number(spId),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.status || data.error || "Failed to decline job");
        return;
      }

      toast.info(`Job ${job.id} declined`);
      setIncomingJobs((prev) => prev.filter((j) => j.id !== job.id));
      setSelectedJob((prev) => (prev?.id === job.id ? null : prev));
      setShowNotificationModal(false);
      setNotificationJob(null);
    } catch {
      toast.error("Could not connect to server");
    }
  };

  const handleOpenJob = (job: Job) => {
    navigate(`/sp/jobs/${job.id}`);
  };

  const combinedJobs = [...incomingJobs, ...activeJobs];
  const uniqueCombinedJobs = Array.from(
    new Map(combinedJobs.map((job) => [job.id, job])).values()
  );

  const mapMarkers = uniqueCombinedJobs
    .map((job) => ({
      position: [job.lat, job.lng] as [number, number],
      label: `${job.client_name} - ${job.service_type}`,
      type: "job" as const,
      onClick: () => setSelectedJob(job),
    }))
    .filter((m) => m.position[0] && m.position[1]);

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <div className="w-96 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-white text-xl">Service Provider Jobs</h2>
          <p className="text-gray-400 text-sm mt-1">
            {loading
              ? "Loading..."
              : `${incomingJobs.length} incoming • ${activeJobs.length} active`}
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-sm font-medium">Incoming Jobs</h3>
                <span className="text-gray-400 text-xs">{incomingJobs.length}</span>
              </div>

              <div className="space-y-4">
                {incomingJobs.map((job) => (
                  <Card
                    key={job.id}
                    className="bg-gray-800 border-gray-700 p-4 cursor-pointer hover:bg-gray-750 transition-colors"
                    onClick={() => setSelectedJob(job)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-white">{job.client_name}</h3>
                      {job.priority === "high" && (
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
                      <span className="text-gray-400">
                        {job.distance_km.toFixed(1)} km away
                      </span>
                      <span className="text-gray-400">
                        {new Date(job.appointment_time).toLocaleTimeString("en-ZA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </Card>
                ))}

                {!loading && incomingJobs.length === 0 && (
                  <div className="text-center text-gray-500 py-6 text-sm">
                    No incoming jobs
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white text-sm font-medium">Active Jobs</h3>
                <span className="text-gray-400 text-xs">{activeJobs.length}</span>
              </div>

              <div className="space-y-4">
                {activeJobs.map((job) => (
                  <Card
                    key={`active-${job.id}`}
                    className="bg-gray-800 border-gray-700 p-4 cursor-pointer hover:bg-gray-750 transition-colors"
                    onClick={() => navigate(`/sp/jobs/${job.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-white">{job.client_name}</h3>
                      <Badge>{job.stage?.replace("_", " ") || "active"}</Badge>
                    </div>

                    <Badge variant="secondary" className="mb-2">
                      {job.service_type}
                    </Badge>

                    <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                      {job.description}
                    </p>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        {job.distance_km.toFixed(1)} km away
                      </span>
                      <span className="text-blue-400 text-sm">Open Job</span>
                    </div>
                  </Card>
                ))}

                {!loading && activeJobs.length === 0 && (
                  <div className="text-center text-gray-500 py-6 text-sm">
                    No active jobs
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 relative">
        <MapView
          center={[-26.1234, 28.0456]}
          zoom={12}
          markers={mapMarkers}
        />

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
                onOpenJob={() => handleOpenJob(selectedJob)}
              />
            </div>
          </div>
        )}

        <div className="absolute bottom-6 left-6">
          <Card className="bg-gray-900 border-gray-800 p-4">
            <p className="text-gray-400 text-sm">Active Jobs</p>
            <p className="text-white text-2xl">{activeJobs.length}</p>
          </Card>
        </div>
      </div>

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
                  <p className="text-white">
                    {notificationJob.distance_km.toFixed(1)} km
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">Time</p>
                  <p className="text-white">
                    {new Date(notificationJob.appointment_time).toLocaleTimeString(
                      "en-ZA",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() =>
                notificationJob && handleDeclineJob(notificationJob)
              }
            >
              Decline
            </Button>
            <Button
              onClick={() =>
                notificationJob && handleAcceptJob(notificationJob)
              }
            >
              Accept Job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}