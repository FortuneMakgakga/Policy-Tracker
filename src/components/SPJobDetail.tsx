import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { Timeline } from './Timeline';
import { QuoteBuilder, QuoteData } from './QuoteBuilder';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { MapPin, Phone, Clock, Camera, FileText, Pause, Play, CheckCircle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { toast } from 'sonner';

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
  timeline: Array<{
    stage: string;
    label: string;
    timestamp?: string;
    completed: boolean;
    current?: boolean;
  }>;
}

export function SPJobDetail() {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuoteBuilder, setShowQuoteBuilder] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  useEffect(() => {
    fetch('/fixtures/sp_job_detail.json')
      .then(r => r.json())
      .then(data => {
        setJob(data);
        setUploadedPhotos(data.photos || []);
        setLoading(false);
      });
  }, []);

  const handleStartWork = () => {
    toast.success('Work started');
    if (job) {
      setJob({ ...job, stage: 'in_progress', status: 'In Progress' });
    }
  };

  const handlePause = () => {
    if (!pauseReason.trim()) {
      toast.error('Please provide a reason for pausing');
      return;
    }
    toast.info('Job paused');
    if (job) {
      setJob({ ...job, stage: 'paused', status: 'Paused' });
    }
    setShowPauseDialog(false);
    setPauseReason('');
  };

  const handleResume = () => {
    toast.success('Job resumed');
    if (job) {
      setJob({ ...job, stage: 'in_progress', status: 'In Progress' });
    }
  };

  const handleSubmitQuote = (quoteData: QuoteData) => {
    toast.success('Quote submitted to client');
    if (job) {
      setJob({ ...job, stage: 'quoted', status: 'Quote Sent' });
    }
    setShowQuoteBuilder(false);
  };

  const handleComplete = () => {
    if (uploadedPhotos.length === 0) {
      toast.error('Please upload at least one photo of the completed work');
      return;
    }
    toast.success('Job marked as complete. Generating invoice...');
    if (job) {
      setJob({ ...job, stage: 'invoiced', status: 'Invoiced' });
    }
    setShowCompleteDialog(false);
    setCompletionNotes('');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // In a real app, you would upload to a server
      // For demo, we'll just use placeholder URLs
      const newPhotos = Array.from(files).map((file, idx) => 
        `https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=300&fit=crop&q=80&sig=${Date.now()}_${idx}`
      );
      setUploadedPhotos([...uploadedPhotos, ...newPhotos]);
      toast.success(`${files.length} photo(s) uploaded`);
    }
  };

  if (loading || !job) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const canStartWork = job.stage === 'arrived';
  const canPause = job.stage === 'in_progress';
  const isPaused = job.stage === 'paused';
  const canQuote = job.stage === 'in_progress' || job.stage === 'paused';
  const canComplete = job.stage === 'approved';

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <Card className="bg-gray-900 border-gray-800 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-white text-2xl mb-1">Job #{job.id}</h1>
              <p className="text-gray-400">{job.service_type}</p>
            </div>
            <Badge>{job.status}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-gray-400 text-sm">Location</p>
                <p className="text-white text-sm">{job.address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-gray-400 text-sm">Client</p>
                <p className="text-white text-sm">{job.client_name}</p>
                <p className="text-gray-400 text-sm">{job.client_phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-gray-400 text-sm">Appointment</p>
                <p className="text-white text-sm">
                  {new Date(job.appointment_time).toLocaleString('en-ZA', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {canStartWork && (
            <Button onClick={handleStartWork} className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              Start Work
            </Button>
          )}

          {canPause && (
            <Button onClick={() => setShowPauseDialog(true)} variant="outline" className="flex-1">
              <Pause className="w-4 h-4 mr-2" />
              Pause Job
            </Button>
          )}

          {isPaused && (
            <Button onClick={handleResume} className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              Resume Job
            </Button>
          )}

          {canQuote && (
            <Button onClick={() => setShowQuoteBuilder(true)} variant="outline" className="flex-1">
              <FileText className="w-4 h-4 mr-2" />
              Create Quote
            </Button>
          )}

          {canComplete && (
            <Button onClick={() => setShowCompleteDialog(true)} className="flex-1">
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Job
            </Button>
          )}
        </div>

        {/* Main Content */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="bg-gray-900 w-full">
            <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
            <TabsTrigger value="photos" className="flex-1">Photos</TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card className="bg-gray-900 border-gray-800 p-6">
              <h3 className="text-white mb-4">Job Description</h3>
              <p className="text-gray-300">{job.description}</p>
            </Card>
          </TabsContent>

          <TabsContent value="photos">
            <Card className="bg-gray-900 border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white">Photos</h3>
                <Button onClick={() => document.getElementById('photo-upload')?.click()} size="sm">
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
                  {uploadedPhotos.map((photo, idx) => (
                    <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-800">
                      <ImageWithFallback
                        src={photo}
                        alt={`Job photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
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
              <Timeline events={job.timeline} />
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quote Builder */}
        {showQuoteBuilder && (
          <QuoteBuilder
            jobId={job.id}
            onSubmit={handleSubmitQuote}
            onCancel={() => setShowQuoteBuilder(false)}
          />
        )}

        {/* Pause Dialog */}
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
                placeholder="e.g., Waiting for parts, Client requested delay..."
                value={pauseReason}
                onChange={e => setPauseReason(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPauseDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handlePause}>
                Pause Job
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complete Dialog */}
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
                <Label className="text-white mb-2 block">Completion Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any final notes about the completed work..."
                  value={completionNotes}
                  onChange={e => setCompletionNotes(e.target.value)}
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
              <Button onClick={handleComplete}>
                Complete & Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
