import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Users, Briefcase, FileText } from 'lucide-react';

const mockProviders = [
  { id: 'sp_001', name: 'John Smith', skills: ['Electrical', 'Plumbing'], rating: 4.8, jobs: 342, status: 'active' },
  { id: 'sp_002', name: 'Sarah Jones', skills: ['HVAC', 'Plumbing'], rating: 4.9, jobs: 289, status: 'active' },
  { id: 'sp_003', name: 'Mike Brown', skills: ['Electrical'], rating: 4.7, jobs: 156, status: 'active' },
  { id: 'sp_004', name: 'Emma Davis', skills: ['Plumbing', 'HVAC'], rating: 4.6, jobs: 198, status: 'inactive' },
];

const mockJobs = [
  { id: 'job_001', client: 'Sarah Johnson', provider: 'John Smith', service: 'Plumbing', status: 'completed', amount: 4025 },
  { id: 'job_002', client: 'Michael Chen', provider: 'Sarah Jones', service: 'Electrical', status: 'in_progress', amount: 3200 },
  { id: 'job_003', client: 'Emily Williams', provider: 'Mike Brown', service: 'HVAC', status: 'quoted', amount: 5800 },
  { id: 'job_004', client: 'David Brown', provider: 'Emma Davis', service: 'Plumbing', status: 'en_route', amount: 2500 },
  { id: 'job_005', client: 'Lisa Anderson', provider: 'John Smith', service: 'Electrical', status: 'paid', amount: 4025 },
];

const mockClaims = [
  { id: 'claim_001', job: 'job_002', provider: 'Sarah Jones', reason: 'Additional materials required', amount: 450, status: 'pending' },
  { id: 'claim_002', job: 'job_003', provider: 'Mike Brown', reason: 'Extended labor hours', amount: 680, status: 'approved' },
  { id: 'claim_003', job: 'job_001', provider: 'John Smith', reason: 'Emergency call-out', amount: 250, status: 'rejected' },
];

export function AdminView() {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-white text-3xl mb-2">Admin Dashboard</h1>
          <p className="text-gray-400">Manage providers, jobs, and claims</p>
        </div>

        <Tabs defaultValue="providers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="providers">
              <Users className="w-4 h-4 mr-2" />
              Service Providers
            </TabsTrigger>
            <TabsTrigger value="jobs">
              <Briefcase className="w-4 h-4 mr-2" />
              All Jobs
            </TabsTrigger>
            <TabsTrigger value="claims">
              <FileText className="w-4 h-4 mr-2" />
              Claims
            </TabsTrigger>
          </TabsList>

          <TabsContent value="providers">
            <Card className="bg-gray-900 border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-gray-850">
                    <TableHead className="text-gray-400">Provider ID</TableHead>
                    <TableHead className="text-gray-400">Name</TableHead>
                    <TableHead className="text-gray-400">Skills</TableHead>
                    <TableHead className="text-gray-400">Rating</TableHead>
                    <TableHead className="text-gray-400">Jobs Completed</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockProviders.map((provider) => (
                    <TableRow key={provider.id} className="border-gray-800 hover:bg-gray-850">
                      <TableCell className="text-gray-400">{provider.id}</TableCell>
                      <TableCell className="text-white">{provider.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {provider.skills.map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-white">⭐ {provider.rating}</TableCell>
                      <TableCell className="text-white">{provider.jobs}</TableCell>
                      <TableCell>
                        <Badge variant={provider.status === 'active' ? 'default' : 'secondary'}>
                          {provider.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="jobs">
            <Card className="bg-gray-900 border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-gray-850">
                    <TableHead className="text-gray-400">Job ID</TableHead>
                    <TableHead className="text-gray-400">Client</TableHead>
                    <TableHead className="text-gray-400">Provider</TableHead>
                    <TableHead className="text-gray-400">Service</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockJobs.map((job) => (
                    <TableRow key={job.id} className="border-gray-800 hover:bg-gray-850">
                      <TableCell className="text-gray-400">{job.id}</TableCell>
                      <TableCell className="text-white">{job.client}</TableCell>
                      <TableCell className="text-white">{job.provider}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{job.service}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge>{job.status.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-white">R {job.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="claims">
            <Card className="bg-gray-900 border-gray-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-800 hover:bg-gray-850">
                    <TableHead className="text-gray-400">Claim ID</TableHead>
                    <TableHead className="text-gray-400">Job ID</TableHead>
                    <TableHead className="text-gray-400">Provider</TableHead>
                    <TableHead className="text-gray-400">Reason</TableHead>
                    <TableHead className="text-gray-400">Amount</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockClaims.map((claim) => (
                    <TableRow key={claim.id} className="border-gray-800 hover:bg-gray-850">
                      <TableCell className="text-gray-400">{claim.id}</TableCell>
                      <TableCell className="text-gray-400">{claim.job}</TableCell>
                      <TableCell className="text-white">{claim.provider}</TableCell>
                      <TableCell className="text-white">{claim.reason}</TableCell>
                      <TableCell className="text-white">R {claim.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            claim.status === 'approved'
                              ? 'default'
                              : claim.status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {claim.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="text-gray-400">Total Providers</h3>
            </div>
            <p className="text-white text-3xl">{mockProviders.length}</p>
            <p className="text-gray-500 text-sm mt-1">
              {mockProviders.filter(p => p.status === 'active').length} active
            </p>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="w-5 h-5 text-emerald-400" />
              <h3 className="text-gray-400">Total Jobs</h3>
            </div>
            <p className="text-white text-3xl">{mockJobs.length}</p>
            <p className="text-gray-500 text-sm mt-1">
              {mockJobs.filter(j => j.status === 'completed').length} completed
            </p>
          </Card>

          <Card className="bg-gray-900 border-gray-800 p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <h3 className="text-gray-400">Pending Claims</h3>
            </div>
            <p className="text-white text-3xl">
              {mockClaims.filter(c => c.status === 'pending').length}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              R {mockClaims.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0).toFixed(2)} total
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
