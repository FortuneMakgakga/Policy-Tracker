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
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
        <Home className="w-6 h-6 text-white" />
      </div>
      <div>
        <h1 className="text-white text-xl">Home Assist</h1>
        <p className="text-gray-400 text-xs">Professional Home Repair Services</p>
      </div>
    </div>
  );
}

function ClientLayout() {
  const { logout } = useRole();

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Brand />
          <nav className="flex items-center gap-3">
            <Link to="/client" className="text-gray-300 hover:text-white text-sm">
              Dashboard
            </Link>
            <Link to="/client/job-request" className="text-gray-300 hover:text-white text-sm">
              Request Job
            </Link>
            <button
              onClick={() => {
                logout();
                toast('Logged out successfully', { description: 'You have been signed out.' });
              }}
              className="rounded-md border border-gray-700 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function SPLayout() {
  const { logout } = useRole();

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Brand />
          <nav className="flex items-center gap-3">
            <Link to="/sp" className="text-gray-300 hover:text-white text-sm">
              Dashboard
            </Link>
            <button
              onClick={() => {
                logout();
                toast('Logged out successfully', { description: 'You have been signed out.' });
              }}
              className="rounded-md border border-gray-700 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function AdminLayout() {
  const { logout } = useRole();

  return (
    <div className="min-h-screen bg-gray-950">
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Brand />
          <nav className="flex items-center gap-3">
            <button
              onClick={() => {
                logout();
                toast('Logged out successfully', { description: 'You have been signed out.' });
              }}
              className="rounded-md border border-gray-700 px-3 py-1.5 text-sm text-white hover:bg-gray-800"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6">
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

// Re-export for pages that historically imported from @/App
export { useRole } from '@/auth/RoleProvider';
