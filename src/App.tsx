import { useEffect, useMemo, useState, createContext, useContext, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';

import { ClientDashboard } from '@/components/ClientDashboard';
import ClientJobRequest from '@/pages/ClientJobRequest';

import { SPDashboard } from '@/components/SPDashboard';
import { SPJobDetail } from '@/components/SPJobDetail';
import { AdminView } from '@/components/AdminView';

import Landing from '@/pages/Landing';
import RegisterClient from '@/pages/RegisterClient';
import RegisterSP from '@/pages/Registersp';

import LoginClient from '@/pages/LoginClient';
import LoginSP from '@/pages/LoginSP';
import LoginAdmin from '@/pages/LoginAdmin';

import { Home } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

/* ---------------- Roles ---------------- */
type Role = 'client' | 'sp' | 'admin' | null;
type RoleCtx = { role: Role; setRole: (r: Role) => void; logout: () => void };
const RoleContext = createContext<RoleCtx | null>(null);

function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}

function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => (localStorage.getItem('role') as Role) || null);

  const setRole = (r: Role) => {
    setRoleState(r);
    if (r) localStorage.setItem('role', r);
    else localStorage.removeItem('role');
  };

  const logout = () => setRole(null);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.dataset.theme = role ?? 'sp';

    const titles: Record<'client' | 'sp' | 'admin', string> = {
      client: 'Home Assist — Client',
      sp: 'Home Assist — Service Provider',
      admin: 'Home Assist — Admin',
    };

    document.title = role ? titles[role] : 'Home Assist';
  }, [role]);

  const value = useMemo(() => ({ role, setRole, logout }), [role]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

/* --------------- Guard --------------- */
function RoleGate({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { role } = useRole();

  if (!role) return <Navigate to="/" replace />;
  if (!allow.includes(role)) return <Navigate to={`/${role}`} replace />;

  return children;
}

/* --------------- Shared brand --------------- */
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

/* --------------- Role-specific layouts --------------- */
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

/* --------------- Route elements --------------- */
function ClientHome() {
  return <ClientDashboard />;
}

function SPHome() {
  return <SPDashboard />;
}

function SPJobPage() {
  return <SPJobDetail />;
}

function AdminHome() {
  return <AdminView />;
}

/* --------------- App --------------- */
export default function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing */}
          <Route path="/" element={<Landing />} />

          {/* Login pages */}
          <Route path="/login-client" element={<LoginClient />} />
          <Route path="/login-sp" element={<LoginSP />} />
          <Route path="/login-admin" element={<LoginAdmin />} />

          {/* Registration */}
          <Route path="/register-client" element={<RegisterClient />} />
          <Route path="/register-sp" element={<RegisterSP />} />

          {/* Client area */}
          <Route
            path="/client"
            element={
              <RoleGate allow={['client']}>
                <ClientLayout />
              </RoleGate>
            }
          >
            <Route index element={<ClientHome />} />
            <Route path="job-request" element={<ClientJobRequest />} />
          </Route>

          {/* Service Provider area */}
          <Route
            path="/sp"
            element={
              <RoleGate allow={['sp']}>
                <SPLayout />
              </RoleGate>
            }
          >
            <Route index element={<SPHome />} />
            <Route path="jobs/:id" element={<SPJobPage />} />
          </Route>

          {/* Admin area */}
          <Route
            path="/admin"
            element={
              <RoleGate allow={['admin']}>
                <AdminLayout />
              </RoleGate>
            }
          >
            <Route index element={<AdminHome />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <Toaster />
      </BrowserRouter>
    </RoleProvider>
  );
}

export { useRole };