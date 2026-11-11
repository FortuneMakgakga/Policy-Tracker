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
  TableRow,
} from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Users, Briefcase, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE } from '@/lib/api';

interface Job {
  id: string;
  client_name: string;
  service_type: string;
  description: string;
  address: string;
  stage: string;
  status: string;
}

interface Quote {
  id: number;
  job_request_id: number;
  total_amount: number;
  details: string;
  status: string;
  created_at: string;
}

interface ProviderSummary {
  id: number;
  name: string;
  skill: string;
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
    service_type: job.service_type || job.skill_required || 'General',
    description: job.description || job.job_description || '',
    address: job.address || job.client_address || '',
    stage: job.stage || 'new',
    status: job.status || 'Open',
  });

  const loadJobs = async () => {
    try {
      setLoadingJobs(true);
      const res = await fetch(`${API_BASE}/api/admin/jobs`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load jobs');
      const data = await res.json();
      setJobs((data as any[]).map(mapJob));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load jobs');
    } finally {
      setLoadingJobs(false);
    }
  };

  const loadQuotes = async () => {
    try {
      setLoadingQuotes(true);
      const res = await fetch(`${API_BASE}/api/admin/quotes`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load quotes');
      const data = await res.json();
      const flattened: Quote[] = (data as any[])
        .map((quote) => ({
          id: Number(quote.id),
          job_request_id: Number(quote.job_request_id),
          total_amount: Number(quote.total_amount),
          details: quote.details || '',
          status: quote.status || 'Pending',
          created_at: quote.created_at,
        }))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setQuotes(flattened);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load quotes');
    } finally {
      setLoadingQuotes(false);
    }
  };

  const loadProviders = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/providers`, { credentials: 'include' });
      if (!res.ok) {
        setProviders([]);
        return;
      }
      setProviders(await res.json());
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
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load linked job');
      setSelectedJob(mapJob(await res.json()));
    } catch (error) {
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
        { method: 'POST', credentials: 'include' }
      );
      if (!res.ok) throw new Error('Failed to approve quote');
      setQuotes((prev) =>
        prev.map((q) => (q.id === selectedQuote.id ? { ...q, status: 'Approved' } : q))
      );
      setSelectedQuote((prev) => (prev ? { ...prev, status: 'Approved' } : prev));
      toast.success('Quote approved');
      setReviewOpen(false);
    } catch (error) {
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
    <div className="min-h-screen bg-[#f6f6f6]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-black text-3xl font-bold tracking-tight mb-1">Admin</h1>
          <p className="text-[#6b6b6b]">Manage providers, jobs, and quotes</p>
        </div>

        <Tabs defaultValue="quotes" className="space-y-6">
          <TabsList className="bg-white border border-black/5 rounded-full p-1 ha-shadow">
            <TabsTrigger value="quotes" className="rounded-full data-[state=active]:bg-black data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              Quotes
            </TabsTrigger>
            <TabsTrigger value="jobs" className="rounded-full data-[state=active]:bg-black data-[state=active]:text-white">
              <Briefcase className="w-4 h-4 mr-2" />
              Jobs
            </TabsTrigger>
            <TabsTrigger value="providers" className="rounded-full data-[state=active]:bg-black data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Providers
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quotes">
            <div className="space-y-6">
              <Card className="bg-white border-black/5 ha-shadow p-5 rounded-2xl">
                <h2 className="text-black text-lg font-bold mb-4">Pending quotes</h2>
                {loadingQuotes ? (
                  <div className="text-[#6b6b6b]">Loading...</div>
                ) : pendingQuotes.length === 0 ? (
                  <div className="text-[#6b6b6b]">No pending quotes</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-black/10 hover:bg-transparent">
                        <TableHead className="text-[#6b6b6b]">Quote</TableHead>
                        <TableHead className="text-[#6b6b6b]">Job</TableHead>
                        <TableHead className="text-[#6b6b6b]">Amount</TableHead>
                        <TableHead className="text-[#6b6b6b]">Created</TableHead>
                        <TableHead className="text-[#6b6b6b]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingQuotes.map((quote) => (
                        <TableRow key={quote.id} className="border-black/10">
                          <TableCell className="text-black font-medium">#{quote.id}</TableCell>
                          <TableCell className="text-[#444]">{quote.job_request_id}</TableCell>
                          <TableCell className="text-black font-semibold">
                            R {quote.total_amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-[#444]">{formatDate(quote.created_at)}</TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => openQuoteReview(quote)}>
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>

              <Card className="bg-white border-black/5 ha-shadow p-5 rounded-2xl">
                <h2 className="text-black text-lg font-bold mb-4">Approved</h2>
                {approvedQuotes.length === 0 ? (
                  <div className="text-[#6b6b6b]">No approved quotes yet</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-black/10 hover:bg-transparent">
                        <TableHead className="text-[#6b6b6b]">Quote</TableHead>
                        <TableHead className="text-[#6b6b6b]">Job</TableHead>
                        <TableHead className="text-[#6b6b6b]">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedQuotes.map((quote) => (
                        <TableRow key={quote.id} className="border-black/10">
                          <TableCell className="text-black">#{quote.id}</TableCell>
                          <TableCell className="text-[#444]">{quote.job_request_id}</TableCell>
                          <TableCell className="text-black font-semibold">
                            R {quote.total_amount.toFixed(2)}
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
            <Card className="bg-white border-black/5 ha-shadow p-5 rounded-2xl">
              <h2 className="text-black text-lg font-bold mb-4">Jobs</h2>
              {loadingJobs ? (
                <div className="text-[#6b6b6b]">Loading...</div>
              ) : jobs.length === 0 ? (
                <div className="text-[#6b6b6b]">No jobs found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-black/10 hover:bg-transparent">
                      <TableHead className="text-[#6b6b6b]">ID</TableHead>
                      <TableHead className="text-[#6b6b6b]">Client</TableHead>
                      <TableHead className="text-[#6b6b6b]">Service</TableHead>
                      <TableHead className="text-[#6b6b6b]">Stage</TableHead>
                      <TableHead className="text-[#6b6b6b]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id} className="border-black/10">
                        <TableCell className="text-black">{job.id}</TableCell>
                        <TableCell className="text-black font-medium">{job.client_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{job.service_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.stage.replace('_', ' ')}</Badge>
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
            <Card className="bg-white border-black/5 ha-shadow p-5 rounded-2xl">
              <h2 className="text-black text-lg font-bold mb-4">Providers</h2>
              {providers.length === 0 ? (
                <div className="text-[#6b6b6b]">No providers loaded yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-black/10 hover:bg-transparent">
                      <TableHead className="text-[#6b6b6b]">ID</TableHead>
                      <TableHead className="text-[#6b6b6b]">Name</TableHead>
                      <TableHead className="text-[#6b6b6b]">Skill</TableHead>
                      <TableHead className="text-[#6b6b6b]">Province</TableHead>
                      <TableHead className="text-[#6b6b6b]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.map((provider) => (
                      <TableRow key={provider.id} className="border-black/10">
                        <TableCell className="text-black">{provider.id}</TableCell>
                        <TableCell className="text-black font-medium">{provider.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{provider.skill}</Badge>
                        </TableCell>
                        <TableCell className="text-[#444]">{provider.province}</TableCell>
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

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <Card className="bg-white border-black/5 ha-shadow p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-[#ed6c02]" />
              <h3 className="text-[#6b6b6b] text-sm">Pending quotes</h3>
            </div>
            <p className="text-black text-3xl font-bold">{pendingQuotes.length}</p>
          </Card>
          <Card className="bg-white border-black/5 ha-shadow p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="w-5 h-5 text-[#0e8345]" />
              <h3 className="text-[#6b6b6b] text-sm">Tracked jobs</h3>
            </div>
            <p className="text-black text-3xl font-bold">{jobs.length}</p>
          </Card>
          <Card className="bg-white border-black/5 ha-shadow p-5 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-black" />
              <h3 className="text-[#6b6b6b] text-sm">Providers</h3>
            </div>
            <p className="text-black text-3xl font-bold">{providers.length}</p>
          </Card>
        </div>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="bg-white border border-black/10 max-w-2xl rounded-2xl ha-shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-black text-xl font-bold">Quote review</DialogTitle>
            <DialogDescription className="text-[#6b6b6b]">
              Review the quote and linked job before approval
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            {loadingReview || !selectedQuote ? (
              <div className="text-[#6b6b6b] py-8">Loading...</div>
            ) : (
              <div className="space-y-5 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[#6b6b6b] text-sm">Quote ID</p>
                    <p className="text-black font-medium">#{selectedQuote.id}</p>
                  </div>
                  <div>
                    <p className="text-[#6b6b6b] text-sm">Job ID</p>
                    <p className="text-black font-medium">{selectedQuote.job_request_id}</p>
                  </div>
                  <div>
                    <p className="text-[#6b6b6b] text-sm">Amount</p>
                    <p className="text-black text-xl font-bold">
                      R {selectedQuote.total_amount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#6b6b6b] text-sm">Status</p>
                    <Badge variant="secondary">{selectedQuote.status}</Badge>
                  </div>
                </div>

                <div>
                  <p className="text-[#6b6b6b] text-sm mb-2">Details</p>
                  <pre className="text-[#444] text-sm whitespace-pre-wrap bg-[#f6f6f6] p-4 rounded-xl border border-black/5">
                    {selectedQuote.details || 'No details provided'}
                  </pre>
                </div>

                {selectedJob && (
                  <div className="border-t border-black/10 pt-4 space-y-2">
                    <h3 className="text-black font-semibold">Linked job</h3>
                    <p className="text-sm text-[#444]">
                      {selectedJob.client_name} · {selectedJob.service_type}
                    </p>
                    <p className="text-sm text-[#6b6b6b]">{selectedJob.address || '—'}</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApproveQuote}
              disabled={
                !selectedQuote ||
                selectedQuote.status.toLowerCase() === 'approved' ||
                approvingQuoteId === selectedQuote?.id
              }
            >
              {approvingQuoteId === selectedQuote?.id ? 'Approving...' : 'Approve quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
