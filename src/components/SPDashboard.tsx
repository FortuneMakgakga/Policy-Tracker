import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { MapView } from "./MapView";
import { MapPin, Clock, Phone, Check, X } from "lucide-react";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import { API_BASE } from "@/lib/api";

interface Job {
  id: string;
  client_name: string;
  client_phone?: string;
  service_type: string;
  description: string;
  address: string;
  appointment_time?: string;
  stage: string;
  status: string;
  priority?: string;
  lat?: number;
  lng?: number;
  distance_km?: number;
  eta_minutes?: number;
}

function JobCard({
  job,
  onAccept,
  onDecline,
  onOpen,
}: {
  job: Job;
  onAccept?: () => void;
  onDecline?: () => void;
  onOpen?: () => void;
}) {
  return (
    <Card className="bg-white border-black/5 ha-shadow p-5 rounded-2xl">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-black text-lg font-bold mb-1">{job.client_name}</h3>
          <Badge variant={job.priority === "high" ? "destructive" : "secondary"}>
            {job.service_type}
          </Badge>
        </div>
        <Badge variant="outline">{job.stage.replace("_", " ")}</Badge>
      </div>

      <p className="text-[#444] text-sm mb-3 line-clamp-2">{job.description}</p>

      <div className="space-y-2 text-sm mb-4">
        <div className="flex items-center gap-2 text-[#6b6b6b]">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="truncate">{job.address || "No address"}</span>
        </div>
        {job.appointment_time && (
          <div className="flex items-center gap-2 text-[#6b6b6b]">
            <Clock className="w-4 h-4 shrink-0" />
            <span>
              {new Date(job.appointment_time).toLocaleString("en-ZA", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        )}
        {job.client_phone && (
          <div className="flex items-center gap-2 text-[#6b6b6b]">
            <Phone className="w-4 h-4 shrink-0" />
            <span>{job.client_phone}</span>
          </div>
        )}
        {(job.distance_km != null || job.eta_minutes != null) && (
          <p className="text-black text-sm font-medium">
            {job.distance_km != null && `${job.distance_km.toFixed(1)} km`}
            {job.distance_km != null && job.eta_minutes != null && " · "}
            {job.eta_minutes != null && `${job.eta_minutes} min`}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        {onAccept && (
          <Button onClick={onAccept} className="flex-1" size="sm">
            <Check className="w-4 h-4" />
            Accept
          </Button>
        )}
        {onDecline && (
          <Button onClick={onDecline} variant="outline" className="flex-1" size="sm">
            <X className="w-4 h-4" />
            Decline
          </Button>
        )}
        {onOpen && (
          <Button onClick={onOpen} className="flex-1" size="sm">
            Open job
          </Button>
        )}
      </div>
    </Card>
  );
}

export function SPDashboard() {
  const navigate = useNavigate();
  const [incomingJobs, setIncomingJobs] = useState<Job[]>([]);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [spLat] = useState(-26.2041);
  const [spLng] = useState(28.0473);

  const spId = localStorage.getItem("spId");

  useEffect(() => {
    let socket: Socket | null = null;

    const loadJobs = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/sp/jobs`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load jobs");
        const data = await res.json();
        const list: Job[] = (Array.isArray(data) ? data : data.jobs || []).map(
          (j: any) => ({
            id: String(j.id),
            client_name: j.client_name || "Client",
            client_phone: j.client_phone,
            service_type: j.service_type || j.skill_required || "General",
            description: j.description || j.job_description || "",
            address: j.address || "",
            appointment_time: j.appointment_time,
            stage: j.stage || "new",
            status: j.status || "Open",
            priority: j.priority,
            lat: j.lat,
            lng: j.lng,
            distance_km: j.distance_km,
            eta_minutes: j.eta_minutes,
          })
        );

        setIncomingJobs(
          list.filter((j) => ["new", "assigned"].includes(j.stage))
        );
        setActiveJobs(
          list.filter((j) => !["new", "assigned", "completed", "invoiced"].includes(j.stage))
        );
      } catch (err) {
        console.error(err);
        toast.error("Could not load jobs");
      } finally {
        setLoading(false);
      }
    };

    loadJobs();

    try {
      socket = io(API_BASE, { withCredentials: true });
      if (spId) socket.emit("join_sp", spId);

      socket.on("job_updated", (payload: any) => {
        const updated: Job = {
          id: String(payload.id ?? payload.job_id),
          client_name: payload.client_name || "Client",
          client_phone: payload.client_phone,
          service_type: payload.service_type || payload.skill_required || "General",
          description: payload.description || payload.job_description || "",
          address: payload.address || "",
          appointment_time: payload.appointment_time,
          stage: payload.stage || "new",
          status: payload.status || "Open",
          priority: payload.priority,
          lat: payload.lat,
          lng: payload.lng,
          distance_km: payload.distance_km,
          eta_minutes: payload.eta_minutes,
        };

        setIncomingJobs((prev) => {
          const without = prev.filter((j) => j.id !== updated.id);
          return ["new", "assigned"].includes(updated.stage)
            ? [updated, ...without]
            : without;
        });

        setActiveJobs((prev) => {
          const without = prev.filter((j) => j.id !== updated.id);
          return !["new", "assigned", "completed", "invoiced"].includes(updated.stage)
            ? [updated, ...without]
            : without;
        });
      });
    } catch (e) {
      console.warn("Socket unavailable", e);
    }

    return () => {
      socket?.disconnect();
    };
  }, [spId]);

  const handleAcceptJob = async (job: Job) => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${job.id}/accept`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Job accepted");
      setIncomingJobs((prev) => prev.filter((j) => j.id !== job.id));
      setActiveJobs((prev) => [{ ...job, stage: "accepted" }, ...prev]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Accept failed");
    }
  };

  const handleDeclineJob = async (job: Job) => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${job.id}/decline`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Job declined");
      setIncomingJobs((prev) => prev.filter((j) => j.id !== job.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Decline failed");
    }
  };

  const markers = [
    { position: [spLat, spLng] as [number, number], label: "You", type: "provider" as const },
    ...[...incomingJobs, ...activeJobs]
      .filter((j) => j.lat != null && j.lng != null)
      .map((j) => ({
        position: [j.lat!, j.lng!] as [number, number],
        label: j.client_name,
        type: "client" as const,
      })),
  ];

  return (
    <div className="min-h-screen bg-[#f6f6f6] flex">
      <div className="w-full sm:w-96 bg-white border-r border-black/10 flex flex-col ha-shadow z-10">
        <div className="p-6 border-b border-black/10">
          <h2 className="text-black text-xl font-bold tracking-tight">Jobs</h2>
          <p className="text-[#6b6b6b] text-sm mt-1">
            {loading
              ? "Loading..."
              : `${incomingJobs.length} incoming · ${activeJobs.length} active`}
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-black text-sm font-semibold">Incoming</h3>
                <span className="text-[#6b6b6b] text-xs">{incomingJobs.length}</span>
              </div>
              <div className="space-y-3">
                {incomingJobs.length === 0 ? (
                  <p className="text-[#6b6b6b] text-sm py-4 text-center">No incoming jobs</p>
                ) : (
                  incomingJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onAccept={() => handleAcceptJob(job)}
                      onDecline={() => handleDeclineJob(job)}
                    />
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-black text-sm font-semibold">Active</h3>
                <span className="text-[#6b6b6b] text-xs">{activeJobs.length}</span>
              </div>
              <div className="space-y-3">
                {activeJobs.length === 0 ? (
                  <p className="text-[#6b6b6b] text-sm py-4 text-center">No active jobs</p>
                ) : (
                  activeJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onOpen={() => navigate(`/sp/jobs/${job.id}`)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <div className="hidden sm:block flex-1 relative min-h-screen">
        <MapView center={[spLat, spLng]} markers={markers} className="absolute inset-0" />
      </div>
    </div>
  );
}
