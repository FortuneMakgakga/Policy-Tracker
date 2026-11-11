import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Timeline } from "./Timeline";
import { QuoteBuilder } from "./QuoteBuilder";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  MapPin,
  Phone,
  Clock,
  Camera,
  FileText,
  Pause,
  Play,
  CheckCircle,
  ArrowLeft,
  Navigation,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

interface TimelineEvent {
  stage: string;
  label: string;
  timestamp?: string;
  completed: boolean;
  current?: boolean;
}

interface Job {
  id: string;
  client_name: string;
  client_phone: string;
  service_type: string;
  description: string;
  address: string;
  appointment_time: string;
  stage: string;
  status: string;
  photos?: string[];
  pause_reason?: string;
  completion_notes?: string;
  created_at?: string;
  accepted_at?: string;
  arrived_at?: string;
  started_at?: string;
  paused_at?: string;
  completed_at?: string;
}

const STAGE_ORDER = [
  "new", "assigned", "accepted", "arrived", "in_progress",
  "quoted", "approved", "completed", "invoiced",
];

const STAGE_LABELS: Record<string, string> = {
  new: "New Job",
  assigned: "Assigned",
  accepted: "Accepted",
  arrived: "Arrived on Site",
  in_progress: "Work Started",
  paused: "Paused",
  quoted: "Quote Sent",
  approved: "Quote Approved",
  completed: "Work Completed",
  invoiced: "Invoice Generated",
};

function buildTimeline(job: Job): TimelineEvent[] {
  if (job.stage === "paused") {
    return [
      { stage: "new", label: STAGE_LABELS.new, timestamp: job.created_at, completed: true },
      { stage: "accepted", label: STAGE_LABELS.accepted, timestamp: job.accepted_at, completed: true },
      { stage: "arrived", label: STAGE_LABELS.arrived, timestamp: job.arrived_at, completed: !!job.arrived_at },
      { stage: "in_progress", label: STAGE_LABELS.in_progress, timestamp: job.started_at, completed: !!job.started_at },
      { stage: "paused", label: STAGE_LABELS.paused, timestamp: job.paused_at, completed: false, current: true },
    ];
  }
  const currentStageIndex = STAGE_ORDER.indexOf(job.stage);
  return STAGE_ORDER.map((stage, index) => ({
    stage,
    label: STAGE_LABELS[stage] || stage,
    completed: currentStageIndex > index,
    current: currentStageIndex === index,
    timestamp:
      stage === "new" ? job.created_at
      : stage === "accepted" ? job.accepted_at
      : stage === "arrived" ? job.arrived_at
      : stage === "in_progress" ? job.started_at
      : stage === "completed" || stage === "invoiced" ? job.completed_at
      : undefined,
  }));
}

async function fetchJob(jobId: string): Promise<Job> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text() || "Failed to load job");
  return res.json();
}

async function updateJobStage(jobId: string, stage: string, extra: Record<string, unknown> = {}) {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/stage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ stage, ...extra }),
  });
  if (!res.ok) throw new Error(await res.text() || "Failed to update job stage");
  return res.json();
}

export function SPJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    const loadJob = async () => {
      try {
        setLoading(true);
        const data = await fetchJob(id);
        if (!mounted) return;
        setJob(data);
        setUploadedPhotos(data.photos || []);
      } catch {
        toast.error("Failed to load job details");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadJob();
    return () => { mounted = false; };
  }, [id]);

  const timeline = useMemo(() => (job ? buildTimeline(job) : []), [job]);

  const handleStageUpdate = async (nextStage: string, successMessage: string, extra: Record<string, unknown> = {}) => {
    if (!job) return;
    try {
      setSubmitting(true);
      const updated = await updateJobStage(job.id, nextStage, extra);
      setJob(updated);
      setUploadedPhotos(updated.photos || []);
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArrive = () => handleStageUpdate("arrived", "Marked as arrived");
  const handleStartWork = () => handleStageUpdate("in_progress", "Work started");
  const handleResume = () => handleStageUpdate("in_progress", "Job resumed");

  const handlePause = async () => {
    if (!pauseReason.trim()) {
      toast.error("Please provide a reason for pausing");
      return;
    }
    await handleStageUpdate("paused", "Job paused", { pause_reason: pauseReason.trim() });
    setShowPauseDialog(false);
    setPauseReason("");
  };

  const handleComplete = async () => {
    if (!job) return;
    if (uploadedPhotos.length === 0) {
      toast.error("Upload at least one photo before completing");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/api/jobs/${job.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notes: completionNotes.trim() }),
      });
      if (!res.ok) throw new Error(await res.text() || "Failed to complete job");
      const updated = await res.json();
      setJob(updated);
      setUploadedPhotos(updated.photos || []);
      setShowCompleteDialog(false);
      setCompletionNotes("");
      toast.success("Job completed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Completion failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !job) return;
    try {
      setSubmitting(true);
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append("photos", file));
      const res = await fetch(`${API_BASE}/api/jobs/${job.id}/photos`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text() || "Photo upload failed");
      const data = await res.json();
      setUploadedPhotos(data.photos || []);
      setJob((prev) => (prev ? { ...prev, photos: data.photos || [] } : prev));
      toast.success(`${files.length} photo(s) uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !job) {
    return (
      <div className="min-h-screen bg-[#f6f6f6] flex items-center justify-center">
        <div className="text-[#6b6b6b]">Loading job details...</div>
      </div>
    );
  }

  const canArrive = job.stage === "accepted";
  const canStartWork = job.stage === "arrived";
  const canPause = job.stage === "in_progress";
  const isPaused = job.stage === "paused";
  const canQuote = job.stage === "in_progress" || job.stage === "paused";
  const canComplete = job.stage === "approved";
  const isFinished = job.stage === "completed" || job.stage === "invoiced";

  return (
    <div className="min-h-screen bg-[#f6f6f6]">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        <Button variant="outline" onClick={() => navigate("/sp")} className="border-black/10">
          <ArrowLeft className="w-4 h-4" />
          Back to jobs
        </Button>

        <Card className="bg-white border-black/5 ha-shadow p-6 rounded-2xl">
          <div className="flex items-start justify-between mb-4 gap-3">
            <div>
              <h1 className="text-black text-2xl font-bold tracking-tight mb-1">Job #{job.id}</h1>
              <p className="text-[#6b6b6b]">{job.service_type}</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Badge>{job.status}</Badge>
              <Badge variant="secondary">{job.stage.replace("_", " ")}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#6b6b6b] mt-0.5" />
              <div>
                <p className="text-[#6b6b6b] text-sm">Location</p>
                <p className="text-black text-sm">{job.address || "No address"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#6b6b6b] mt-0.5" />
              <div>
                <p className="text-[#6b6b6b] text-sm">Client</p>
                <p className="text-black text-sm font-medium">{job.client_name}</p>
                {job.client_phone ? (
                  <a href={`tel:${job.client_phone}`} className="text-black text-sm underline-offset-2 hover:underline">
                    {job.client_phone}
                  </a>
                ) : (
                  <p className="text-[#6b6b6b] text-sm">No phone</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#6b6b6b] mt-0.5" />
              <div>
                <p className="text-[#6b6b6b] text-sm">Appointment</p>
                <p className="text-black text-sm">
                  {job.appointment_time
                    ? new Date(job.appointment_time).toLocaleString("en-ZA", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })
                    : "No appointment"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex gap-2 flex-wrap">
          {canArrive && (
            <Button onClick={handleArrive} disabled={submitting} className="flex-1">
              <Navigation className="w-4 h-4" /> Mark arrived
            </Button>
          )}
          {canStartWork && (
            <Button onClick={handleStartWork} disabled={submitting} className="flex-1">
              <Play className="w-4 h-4" /> Start work
            </Button>
          )}
          {canPause && (
            <Button onClick={() => setShowPauseDialog(true)} variant="outline" disabled={submitting} className="flex-1">
              <Pause className="w-4 h-4" /> Pause
            </Button>
          )}
          {isPaused && (
            <Button onClick={handleResume} disabled={submitting} className="flex-1">
              <Play className="w-4 h-4" /> Resume
            </Button>
          )}
          {canQuote && (
            <Button onClick={() => setShowQuoteBuilder(true)} variant="outline" disabled={submitting} className="flex-1">
              <FileText className="w-4 h-4" /> Create quote
            </Button>
          )}
          {canComplete && (
            <Button onClick={() => setShowCompleteDialog(true)} disabled={submitting} className="flex-1">
              <CheckCircle className="w-4 h-4" /> Complete job
            </Button>
          )}
          {isFinished && (
            <Button variant="outline" disabled className="flex-1">Job finished</Button>
          )}
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="bg-white border border-black/5 rounded-full p-1 ha-shadow w-full sm:w-auto">
            <TabsTrigger value="details" className="rounded-full flex-1 data-[state=active]:bg-black data-[state=active]:text-white">Details</TabsTrigger>
            <TabsTrigger value="photos" className="rounded-full flex-1 data-[state=active]:bg-black data-[state=active]:text-white">Photos</TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-full flex-1 data-[state=active]:bg-black data-[state=active]:text-white">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card className="bg-white border-black/5 ha-shadow p-6 rounded-2xl space-y-4">
              <div>
                <h3 className="text-black font-semibold mb-2">Description</h3>
                <p className="text-[#444]">{job.description || "No description"}</p>
              </div>
              {job.pause_reason && (
                <div className="p-4 rounded-xl border border-orange-200 bg-orange-50">
                  <h4 className="text-[#ed6c02] font-medium mb-1">Pause reason</h4>
                  <p className="text-[#444] text-sm">{job.pause_reason}</p>
                </div>
              )}
              {job.completion_notes && (
                <div className="p-4 rounded-xl border border-green-200 bg-green-50">
                  <h4 className="text-[#0e8345] font-medium mb-1">Completion notes</h4>
                  <p className="text-[#444] text-sm">{job.completion_notes}</p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="photos">
            <Card className="bg-white border-black/5 ha-shadow p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-black font-semibold">Photos</h3>
                <Button onClick={() => document.getElementById("photo-upload")?.click()} size="sm" disabled={submitting}>
                  <Camera className="w-4 h-4" /> Upload
                </Button>
                <input id="photo-upload" type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
              </div>
              {uploadedPhotos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {uploadedPhotos.map((photo, idx) => {
                    const src = photo.startsWith("http") ? photo : `${API_BASE}${photo}`;
                    return (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-[#f6f6f6]">
                        <ImageWithFallback src={src} alt={`Job photo ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-[#6b6b6b] py-12">No photos yet</div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card className="bg-white border-black/5 ha-shadow p-6 rounded-2xl">
              <h3 className="text-black font-semibold mb-4">Progress</h3>
              <Timeline events={timeline} />
            </Card>
          </TabsContent>
        </Tabs>

        <QuoteBuilder
          open={showQuoteBuilder}
          onOpenChange={setShowQuoteBuilder}
          serviceType={job.service_type}
          jobId={job.id}
          onQuoteCreated={(updatedJob) => setJob(updatedJob)}
        />

        <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
          <DialogContent className="bg-white border-black/10 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-black font-bold">Pause job</DialogTitle>
              <DialogDescription className="text-[#6b6b6b]">Why are you pausing?</DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Label className="text-black mb-2 block">Reason</Label>
              <Textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="e.g. Waiting for parts..."
                className="bg-[#f6f6f6] border-black/10 text-black rounded-xl"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPauseDialog(false)}>Cancel</Button>
              <Button onClick={handlePause} disabled={submitting}>Confirm pause</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <DialogContent className="bg-white border-black/10 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-black font-bold">Complete job</DialogTitle>
              <DialogDescription className="text-[#6b6b6b]">Add completion notes</DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Label className="text-black mb-2 block">Notes</Label>
              <Textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Summarise the work completed..."
                className="bg-[#f6f6f6] border-black/10 text-black rounded-xl"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>Cancel</Button>
              <Button onClick={handleComplete} disabled={submitting}>Complete job</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
