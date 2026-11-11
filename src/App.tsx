import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { toast } from 'sonner';

import { RoleProvider, useRole } from '@/auth/RoleProvider';
import { RoleGate } from '@/auth/RoleGate';

import { ClientDashboard } from '@/components/ClientDashboard';
import { SPDashboard } from '@/components/SPDashboard';
import { SPJobDetail } from '@/components/SPJobDetail';
import { AdminView } from '@/components/AdminView';
import ClientJobRequest from '@/pages/ClientJobRequest';

import Landing from '@/pages/Landing';
import RegisterClient from '@/pages/RegisterClient';
import RegisterSP from '@/pages/Registersp';

import LoginClient from '@/pages/LoginClient';
import LoginSP from '@/pages/LoginSP';
import LoginAdmin from '@/pages/LoginAdmin';

import { Toaster } from '@/components/ui/sonner';

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center">
        <Home className="w-4 h-4 text-white" strokeWidth={2.5} />
      </div>
      <div className="leading-tight">
        <div className="text-black font-bold text-base tracking-tight">Home Assist</div>
      </div>
    </Link>
  );
}

function ShellNav({ links }: { links: { to: string; label: string }[] }) {
  const { logout } = useRole();

  return (
    <header className="bg-white border-b border-black/5 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        <Brand />
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm font-medium text-black/70 hover:text-black px-3 py-2 rounded-full hover:bg-black/5 transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={() => {
              logout();
              toast('Logged out', { description: 'See you next time.' });
            }}
            className="ml-1 text-sm font-semibold text-black px-4 py-2 rounded-full border border-black/10 hover:bg-black/5 transition-colors"
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}

function ClientLayout() {
  return (
    <div className="min-h-screen bg-[#f6f6f6]">
      <ShellNav
        links={[
          { to: '/client', label: 'Home' },
          { to: '/client/job-request', label: 'Request' },
        ]}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function SPLayout() {
  return (
    <div className="min-h-screen bg-[#f6f6f6]">
      <ShellNav links={[{ to: '/sp', label: 'Jobs' }]} />
      <main className="max-w-7xl mx-auto px-0 sm:px-6 py-0 sm:py-6">
        <Outlet />
      </main>
    </div>
  );
}

function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#f6f6f6]">
      <ShellNav links={[{ to: '/admin', label: 'Admin' }]} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login-client" element={<LoginClient />} />
          <Route path="/login-sp" element={<LoginSP />} />
          <Route path="/login-admin" element={<LoginAdmin />} />
          <Route path="/register-client" element={<RegisterClient />} />
          <Route path="/register-sp" element={<RegisterSP />} />
          <Route
            path="/client"
            element={
              <RoleGate allow={['client']}>
                <ClientLayout />
              </RoleGate>
            }
          >
            <Route index element={<ClientDashboard />} />
            <Route path="job-request" element={<ClientJobRequest />} />
          </Route>
          <Route
            path="/sp"
            element={
              <RoleGate allow={['sp']}>
                <SPLayout />
              </RoleGate>
            }
          >
            <Route index element={<SPDashboard />} />
            <Route path="jobs/:id" element={<SPJobDetail />} />
          </Route>
          <Route
            path="/admin"
            element={
              <RoleGate allow={['admin']}>
                <AdminLayout />
              </RoleGate>
            }
          >
            <Route index element={<AdminView />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </RoleProvider>
  );
}

export { useRole } from '@/auth/RoleProvider';
