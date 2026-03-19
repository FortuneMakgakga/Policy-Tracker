import { useEffect, useMemo, useState } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Users, Briefcase, FileText } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = 'https://opulent-happiness-7xvg5xp75vq3p95r-5000.app.github.dev';

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
  assigned_sp_id?: number | null;
  pause_reason?: string;
  completion_notes?: string;
  created_at?: string;
  accepted_at?: string;
  arrived_at?: string;
  started_at?: string;
  completed_at?: string;
  photos?: string[];
}

interface Quote {
  id: number;
  job_request_id: number;
  client_id: number;
  service_provider_id?: number | null;
  total_amount: number;
  details: string;
  status: string;
  created_at: string;
}

interface ProviderSummary {
  id: number;
  name: string;
  email: string;
  skill: string;
  phone: string;
  province: string;
  is_available: boolean;
}

export function AdminView() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingQuotes, setLoadingQuotes] = useState(true);

  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [approvingQuoteId, setApprovingQuoteId] = useState<number | null>(null);

  useEffect(() => {
    loadJobs();
    loadQuotes();
    loadProviders();
  }, []);

  const mapJob = (job: any): Job => ({
    id: String(job.id ?? job.job_id),
    client_name: job.client_name || 'Unknown Client',
    client_phone: job.client_phone || '',
    service_type: job.service_type || job.skill_required || 'General',
    description: job.description || job.job_description || '',
    address: job.address || job.client_address || '',
    appointment_time: job.appointment_time || '',
    stage: job.stage || 'new',
    status: job.status || 'Open',
    assigned_sp_id: job.assigned_sp_id ?? null,
    pause_reason: job.pause_reason || '',
    completion_notes: job.completion_notes || '',
    created_at: job.created_at || '',
    accepted_at: job.accepted_at || '',
    arrived_at: job.arrived_at || '',
    started_at: job.started_at || '',
    completed_at: job.completed_at || '',
    photos: job.photos || [],
  });

  const loadJobs = async () => {
    try {
      setLoadingJobs(true);

      const res = await fetch(`${API_BASE}/api/admin/jobs`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to load jobs');
      }

      const data = await res.json();
      const mapped: Job[] = (data as any[]).map(mapJob);
      setJobs(mapped);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load jobs');
    } finally {
      setLoadingJobs(false);
    }
  };

  const loadQuotes = async () => {
    try {
      setLoadingQuotes(true);

      const res = await fetch(`${API_BASE}/api/admin/quotes`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to load quotes');
      }

      const data = await res.json();

      const flattened: Quote[] = (data as any[])
        .map((quote) => ({
          id: Number(quote.id),
          job_request_id: Number(quote.job_request_id),
          client_id: Number(quote.client_id),
          service_provider_id: quote.service_provider_id ?? null,
          total_amount: Number(quote.total_amount),
          details: quote.details || '',
          status: quote.status || 'Pending',
          created_at: quote.created_at,
        }))
        .sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      setQuotes(flattened);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load quotes');
    } finally {
      setLoadingQuotes(false);
    }
  };

  const loadProviders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/providers`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        setProviders([]);
        return;
      }

      const data = await res.json();
      setProviders(data);
    } catch {
      setProviders([]);
    }
  };

  const openQuoteReview = async (quote: Quote) => {
    try {
      setReviewOpen(true);
      setSelectedQuote(quote);
      setSelectedJob(null);
      setLoadingReview(true);

      const res = await fetch(`${API_BASE}/api/jobs/${quote.job_request_id}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to load linked job');
      }

      const job = await res.json();
      setSelectedJob(mapJob(job));
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load quote review');
    } finally {
      setLoadingReview(false);
    }
  };

  const handleApproveQuote = async () => {
    if (!selectedQuote) return;

    try {
      setApprovingQuoteId(selectedQuote.id);

      const res = await fetch(
        `${API_BASE}/api/jobs/${selectedQuote.job_request_id}/approve-quote`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to approve quote');
      }

      const updatedJobRaw = await res.json();
      const updatedJob = mapJob(updatedJobRaw);

      setQuotes((prev) =>
        prev.map((q) =>
          q.id === selectedQuote.id ? { ...q, status: 'Approved' } : q
        )
      );

      setJobs((prev) =>
        prev.map((job) =>
          job.id === String(selectedQuote.job_request_id) ? updatedJob : job
        )
      );

      setSelectedJob(updatedJob);
      setSelectedQuote((prev) => (prev ? { ...prev, status: 'Approved' } : prev));

      toast.success('Quote approved');
      setReviewOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Approval failed');
    } finally {
      setApprovingQuoteId(null);
    }
  };

  const pendingQuotes = useMemo(
    () => quotes.filter((q) => q.status.toLowerCase() === 'pending'),
    [quotes]
  );

  const approvedQuotes = useMemo(
    () => quotes.filter((q) => q.status.toLowerCase() === 'approved'),
    [quotes]
  );

  const formatDate = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('en-ZA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-white text-3xl mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Manage providers, jobs, and quotes</p>
        </div>

        <Tabs defaultValue="quotes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="quotes">
              <FileText className="w-4 h-4 mr-2" />
              Quote Approvals
            </TabsTrigger>
            <TabsTrigger value="jobs">
              <Briefcase className="w-4 h-4 mr-2" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="providers">
              <Users className="w-4 h-4 mr-2" />
              Providers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quotes">
            <div className="space-y-6">
              <Card className="bg-gray-900 border-gray-800 p-4">
                <h2 className="text-white text-lg mb-4">Pending Quotes</h2>

                {loadingQuotes ? (
                  <div className="text-gray-400">Loading quotes...</div>
                ) : pendingQuotes.length === 0 ? (
                  <div className="text-gray-500">No pending quotes</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800 hover:bg-gray-850">
                        <TableHead className="text-gray-400">Quote ID</TableHead>
                        <TableHead className="text-gray-400">Job ID</TableHead>
                        <TableHead className="text-gray-400">Amount</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Created</TableHead>
                        <TableHead className="text-gray-400">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingQuotes.map((quote) => (
                        <TableRow key={quote.id} className="border-gray-800 hover:bg-gray-850">
                          <TableCell className="text-gray-300">#{quote.id}</TableCell>
                          <TableCell className="text-gray-300">{quote.job_request_id}</TableCell>
                          <TableCell className="text-white">
                            R {quote.total_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{quote.status}</Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {formatDate(quote.created_at)}
                          </TableCell>
                          <TableCell>
                            <Button onClick={() => openQuoteReview(quote)}>
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>

              <Card className="bg-gray-900 border-gray-800 p-4">
                <h2 className="text-white text-lg mb-4">Approved Quotes</h2>

                {approvedQuotes.length === 0 ? (
                  <div className="text-gray-500">No approved quotes yet</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800 hover:bg-gray-850">
                        <TableHead className="text-gray-400">Quote ID</TableHead>
                        <TableHead className="text-gray-400">Job ID</TableHead>
                        <TableHead className="text-gray-400">Amount</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedQuotes.map((quote) => (
                        <TableRow key={quote.id} className="border-gray-800 hover:bg-gray-850">
                          <TableCell className="text-gray-300">#{quote.id}</TableCell>
                          <TableCell className="text-gray-300">{quote.job_request_id}</TableCell>
                          <TableCell className="text-white">
                            R {quote.total_amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge>{quote.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="jobs">
            <Card className="bg-gray-900 border-gray-800 p-4">
              <h2 className="text-white text-lg mb-4">Jobs</h2>

              {loadingJobs ? (
                <div className="text-gray-400">Loading jobs...</div>
              ) : jobs.length === 0 ? (
                <div className="text-gray-500">No jobs found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800 hover:bg-gray-850">
                      <TableHead className="text-gray-400">Job ID</TableHead>
                      <TableHead className="text-gray-400">Client</TableHead>
                      <TableHead className="text-gray-400">Service</TableHead>
                      <TableHead className="text-gray-400">Stage</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id} className="border-gray-800 hover:bg-gray-850">
                        <TableCell className="text-gray-300">{job.id}</TableCell>
                        <TableCell className="text-white">{job.client_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{job.service_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{job.stage.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge>{job.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="providers">
            <Card className="bg-gray-900 border-gray-800 p-4">
              <h2 className="text-white text-lg mb-4">Providers</h2>

              {providers.length === 0 ? (
                <div className="text-gray-500">
                  No provider API wired yet. This tab can stay simple for now.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800 hover:bg-gray-850">
                      <TableHead className="text-gray-400">ID</TableHead>
                      <TableHead className="text-gray-400">Name</TableHead>
                      <TableHead className="text-gray-400">Skill</TableHead>
                      <TableHead className="text-gray-400">Province</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.map((provider) => (
                      <TableRow key={provider.id} className="border-gray-800 hover:bg-gray-850">
                        <TableCell className="text-gray-300">{provider.id}</TableCell>
                        <TableCell className="text-white">{provider.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{provider.skill}</Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">{provider.province}</TableCell>
                        <TableCell>
                          <Badge variant={provider.is_available ? 'default' : 'secondary'}>
                            {provider.is_available ? 'available' : 'unavailable'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <h3 className="text-gray-400">Pending Quotes</h3>
            </div>
            <p className="text-white text-3xl">{pendingQuotes.length}</p>
            <p className="text-gray-500 text-sm mt-1">
              R {pendingQuotes.reduce((sum, q) => sum + q.total_amount, 0).toFixed(2)} total
            </p>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="w-5 h-5 text-emerald-400" />
              <h3 className="text-gray-400">Tracked Jobs</h3>
            </div>
            <p className="text-white text-3xl">{jobs.length}</p>
            <p className="text-gray-500 text-sm mt-1">
              {jobs.filter((j) => j.stage === 'approved').length} approved
            </p>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="text-gray-400">Providers Loaded</h3>
            </div>
            <p className="text-white text-3xl">{providers.length}</p>
            <p className="text-gray-500 text-sm mt-1">
              {providers.filter((p) => p.is_available).length} available
            </p>
          </Card>
        </div>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="bg-slate-800 border border-white/10 max-w-4xl max-h-[90vh] shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          <DialogHeader>
            <DialogTitle className="text-white">Quote Review</DialogTitle>
            <DialogDescription className="text-gray-400">
              Review the quote details and linked job before approval
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            {loadingReview || !selectedQuote ? (
              <div className="text-gray-400 py-6">Loading review...</div>
            ) : (
              <div className="space-y-6">
                <Card className="bg-gray-800 border-gray-700 p-4">
                  <h3 className="text-white mb-3">Quote Summary</h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Quote ID</p>
                      <p className="text-white">#{selectedQuote.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Job ID</p>
                      <p className="text-white">{selectedQuote.job_request_id}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Status</p>
                      <Badge variant="secondary">{selectedQuote.status}</Badge>
                    </div>
                    <div>
                      <p className="text-gray-400">Total Amount</p>
                      <p className="text-white">R {selectedQuote.total_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Created</p>
                      <p className="text-white">{formatDate(selectedQuote.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Service Provider ID</p>
                      <p className="text-white">{selectedQuote.service_provider_id ?? '-'}</p>
                    </div>
                  </div>
                </Card>

                <Card className="bg-gray-800 border-gray-700 p-4">
                  <h3 className="text-white mb-3">Quote Details</h3>
                  <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans">
                    {selectedQuote.details || 'No quote details provided'}
                  </pre>
                </Card>

                <Card className="bg-gray-800 border-gray-700 p-4">
                  <h3 className="text-white mb-3">Linked Job Details</h3>

                  {!selectedJob ? (
                    <div className="text-gray-400">No linked job loaded</div>
                  ) : (
                    <div className="space-y-4 text-sm">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-400">Client</p>
                          <p className="text-white">{selectedJob.client_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Phone</p>
                          <p className="text-white">{selectedJob.client_phone || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Service</p>
                          <p className="text-white">{selectedJob.service_type}</p>
                        </div>
                        <div>
                          <p className="text-gray-400">Stage</p>
                          <Badge variant="secondary">{selectedJob.stage}</Badge>
                        </div>
                        <div>
                          <p className="text-gray-400">Status</p>
                          <Badge>{selectedJob.status}</Badge>
                        </div>
                        <div>
                          <p className="text-gray-400">Appointment</p>
                          <p className="text-white">{formatDate(selectedJob.appointment_time)}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-gray-400">Address</p>
                        <p className="text-white">{selectedJob.address || '-'}</p>
                      </div>

                      <div>
                        <p className="text-gray-400">Job Description</p>
                        <p className="text-white">{selectedJob.description || '-'}</p>
                      </div>

                      {selectedJob.photos && selectedJob.photos.length > 0 && (
                        <div>
                          <p className="text-gray-400 mb-2">Job Photos</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {selectedJob.photos.map((photo, idx) => {
                              const src = photo.startsWith('http')
                                ? photo
                                : `${API_BASE}${photo}`;

                              return (
                                <div
                                  key={idx}
                                  className="aspect-square rounded-lg overflow-hidden bg-gray-900"
                                >
                                  <img
                                    src={src}
                                    alt={`Job photo ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Close
            </Button>
            <Button
              onClick={handleApproveQuote}
              disabled={
                !selectedQuote ||
                selectedQuote.status.toLowerCase() !== 'pending' ||
                approvingQuoteId === selectedQuote.id
              }
            >
              {approvingQuoteId === selectedQuote?.id ? 'Approving...' : 'Approve Quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}