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

const API_BASE =
  "https://opulent-happiness-7xvg5xp75vq3p95r-5000.app.github.dev";

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
  lat?: number;
  lng?: number;
  province?: string;
  assigned_sp_id?: number | null;
  pause_reason?: string;
  completion_notes?: string;
  created_at?: string;
  accepted_at?: string;
  arrived_at?: string;
  started_at?: string;
  paused_at?: string;
  resumed_at?: string;
  completed_at?: string;
}

const STAGE_ORDER = [
  "new",
  "assigned",
  "accepted",
  "arrived",
  "in_progress",
  "quoted",
  "approved",
  "completed",
  "invoiced",
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
      {
        stage: "new",
        label: STAGE_LABELS.new,
        timestamp: job.created_at,
        completed: true,
      },
      {
        stage: "assigned",
        label: STAGE_LABELS.assigned,
        completed: true,
      },
      {
        stage: "accepted",
        label: STAGE_LABELS.accepted,
        timestamp: job.accepted_at,
        completed: true,
      },
      {
        stage: "arrived",
        label: STAGE_LABELS.arrived,
        timestamp: job.arrived_at,
        completed: !!job.arrived_at,
        current: !job.arrived_at,
      },
      {
        stage: "in_progress",
        label: STAGE_LABELS.in_progress,
        timestamp: job.started_at,
        completed: !!job.started_at,
        current: false,
      },
      {
        stage: "paused",
        label: STAGE_LABELS.paused,
        timestamp: job.paused_at,
        completed: false,
        current: true,
      },
    ];
  }

  const currentStageIndex = STAGE_ORDER.indexOf(job.stage);

  return STAGE_ORDER.map((stage, index) => ({
    stage,
    label: STAGE_LABELS[stage] || stage,
    completed: currentStageIndex > index,
    current: currentStageIndex === index,
    timestamp:
      stage === "new"
        ? job.created_at
        : stage === "accepted"
        ? job.accepted_at
        : stage === "arrived"
        ? job.arrived_at
        : stage === "in_progress"
        ? job.started_at
        : stage === "completed" || stage === "invoiced"
        ? job.completed_at
        : undefined,
  }));
}

async function fetchJob(jobId: string): Promise<Job> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to load job");
  }

  return res.json();
}

async function updateJobStage(
  jobId: string,
  stage: string,
  extra: Record<string, unknown> = {}
): Promise<Job> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/stage`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ stage, ...extra }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to update job stage");
  }

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
      } catch (error) {
        console.error(error);
        toast.error("Failed to load job details");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadJob();

    return () => {
      mounted = false;
    };
  }, [id]);

  const timeline = useMemo(() => {
    if (!job) return [];
    return buildTimeline(job);
  }, [job]);

  const handleStageUpdate = async (
    nextStage: string,
    successMessage: string,
    extra: Record<string, unknown> = {}
  ) => {
    if (!job) return;

    try {
      setSubmitting(true);
      const updated = await updateJobStage(job.id, nextStage, extra);
      setJob(updated);
      setUploadedPhotos(updated.photos || []);
      toast.success(successMessage);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArrive = async () => {
    await handleStageUpdate("arrived", "Marked as arrived");
  };

  const handleStartWork = async () => {
    await handleStageUpdate("in_progress", "Work started");
  };

  const handlePause = async () => {
    if (!pauseReason.trim()) {
      toast.error("Please provide a reason for pausing");
      return;
    }

    await handleStageUpdate("paused", "Job paused", {
      pause_reason: pauseReason.trim(),
    });

    setShowPauseDialog(false);
    setPauseReason("");
  };

  const handleResume = async () => {
    await handleStageUpdate("in_progress", "Job resumed");
  };

  const handleComplete = async () => {
    if (!job) return;

    if (uploadedPhotos.length === 0) {
      toast.error("Please upload at least one photo before completing the job");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch(`${API_BASE}/api/jobs/${job.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          notes: completionNotes.trim(),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to complete job");
      }

      const updated = await res.json();
      setJob(updated);
      setUploadedPhotos(updated.photos || []);
      setShowCompleteDialog(false);
      setCompletionNotes("");
      toast.success("Job completed and invoice generated");
    } catch (error) {
      console.error(error);
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

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Photo upload failed");
      }

      const data = await res.json();
      setUploadedPhotos(data.photos || []);
      setJob((prev) => (prev ? { ...prev, photos: data.photos || [] } : prev));
      toast.success(`${files.length} photo(s) uploaded`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !job) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading job details...</div>
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
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigate("/sp")}
            className="border-gray-700 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <Card className="bg-gray-900 border-gray-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-white text-2xl mb-1">Job #{job.id}</h1>
              <p className="text-gray-400">{job.service_type}</p>
            </div>
            <div className="flex gap-2">
              <Badge>{job.status}</Badge>
              <Badge variant="secondary">
                {job.stage.replace("_", " ").toUpperCase()}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-gray-400 text-sm">Location</p>
                <p className="text-white text-sm">{job.address || "No address"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-gray-400 text-sm">Client</p>
                <p className="text-white text-sm">{job.client_name}</p>
                {job.client_phone ? (
                  <a
                    href={`tel:${job.client_phone}`}
                    className="text-blue-400 text-sm hover:underline"
                  >
                    {job.client_phone}
                  </a>
                ) : (
                  <p className="text-gray-400 text-sm">No phone number</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-gray-400 text-sm">Appointment</p>
                <p className="text-white text-sm">
                  {job.appointment_time
                    ? new Date(job.appointment_time).toLocaleString("en-ZA", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "No appointment"}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex gap-3 flex-wrap">
          {canArrive && (
            <Button onClick={handleArrive} disabled={submitting} className="flex-1">
              <Navigation className="w-4 h-4 mr-2" />
              Mark Arrived
            </Button>
          )}

          {canStartWork && (
            <Button onClick={handleStartWork} disabled={submitting} className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              Start Work
            </Button>
          )}

          {canPause && (
            <Button
              onClick={() => setShowPauseDialog(true)}
              variant="outline"
              disabled={submitting}
              className="flex-1"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause Job
            </Button>
          )}

          {isPaused && (
            <Button onClick={handleResume} disabled={submitting} className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              Resume Job
            </Button>
          )}

          {canQuote && (
            <Button
              onClick={() => setShowQuoteBuilder(true)}
              variant="outline"
              disabled={submitting}
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create Quote
            </Button>
          )}

          {canComplete && (
            <Button
              onClick={() => setShowCompleteDialog(true)}
              disabled={submitting}
              className="flex-1"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Job
            </Button>
          )}

          {isFinished && (
            <Button variant="outline" disabled className="flex-1">
              Job Finished
            </Button>
          )}
        </div>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="bg-gray-900 w-full">
            <TabsTrigger value="details" className="flex-1">
              Details
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex-1">
              Photos
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1">
              Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card className="bg-gray-900 border-gray-800 p-6 space-y-4">
              <div>
                <h3 className="text-white mb-2">Job Description</h3>
                <p className="text-gray-300">{job.description || "No description available"}</p>
              </div>

              {job.pause_reason && (
                <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10">
                  <h4 className="text-yellow-400 mb-1">Pause Reason</h4>
                  <p className="text-gray-300 text-sm">{job.pause_reason}</p>
                </div>
              )}

              {job.completion_notes && (
                <div className="p-4 rounded-lg border border-green-500/20 bg-green-500/10">
                  <h4 className="text-green-400 mb-1">Completion Notes</h4>
                  <p className="text-gray-300 text-sm">{job.completion_notes}</p>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="photos">
            <Card className="bg-gray-900 border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white">Photos</h3>
                <Button
                  onClick={() => document.getElementById("photo-upload")?.click()}
                  size="sm"
                  disabled={submitting}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Upload Photos
                </Button>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>

              {uploadedPhotos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {uploadedPhotos.map((photo, idx) => {
                    const src = photo.startsWith("http")
                      ? photo
                      : `${API_BASE}${photo}`;

                    return (
                      <div
                        key={idx}
                        className="aspect-square rounded-lg overflow-hidden bg-gray-800"
                      >
                        <ImageWithFallback
                          src={src}
                          alt={`Job photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  No photos uploaded yet
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="timeline">
            <Card className="bg-gray-900 border-gray-800 p-6">
              <h3 className="text-white mb-4">Job Progress</h3>
              <Timeline events={timeline} />
            </Card>
          </TabsContent>
        </Tabs>

        <QuoteBuilder
          open={showQuoteBuilder}
          onOpenChange={setShowQuoteBuilder}
          serviceType={job.service_type}
          jobId={job.id}
          onQuoteCreated={(updatedJob) => {
            setJob(updatedJob);
          }}
        />

        <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
          <DialogContent className="bg-gray-900 border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white">Pause Job</DialogTitle>
              <DialogDescription className="text-gray-400">
                Please provide a reason for pausing this job
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Label className="text-white mb-2 block">Reason</Label>
              <Textarea
                placeholder="e.g. Waiting for parts, client requested delay..."
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPauseDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handlePause} disabled={submitting}>
                Pause Job
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
          <DialogContent className="bg-gray-900 border-gray-800">
            <DialogHeader>
              <DialogTitle className="text-white">Complete Job</DialogTitle>
              <DialogDescription className="text-gray-400">
                Mark this job as complete and generate invoice
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div>
                <Label className="text-white mb-2 block">Completion Notes</Label>
                <Textarea
                  placeholder="Add final notes about the completed work..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={3}
                />
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-400 text-sm">
                  {uploadedPhotos.length} photo(s) will be included in the invoice
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleComplete} disabled={submitting}>
                Complete & Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}