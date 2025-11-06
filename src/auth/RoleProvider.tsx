import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Role = 'client' | 'sp' | 'admin' | null;

type Ctx = {
  role: Role;
  setRole: (r: Role) => void;
  logout: () => void;
};

const RoleCtx = createContext<Ctx | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => {
    return (localStorage.getItem('role') as Role) || null;
  });

  const setRole = (r: Role) => {
    setRoleState(r);
    if (r) localStorage.setItem('role', r);
    else localStorage.removeItem('role');
  };

  const logout = () => setRole(null);

  // hook your theme to the role (your globals.css uses tokens)
  useEffect(() => {
    document.body.dataset.theme = role ?? 'sp'; // default dark for now
    document.documentElement.classList.add('dark'); // keep dark base on
  }, [role]);

  const value = useMemo(() => ({ role, setRole, logout }), [role]);
  return <RoleCtx.Provider value={value}>{children}</RoleCtx.Provider>;
}

export const useRole = () => {
  const ctx = useContext(RoleCtx);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
};
