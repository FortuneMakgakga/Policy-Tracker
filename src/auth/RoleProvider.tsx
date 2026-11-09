import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Role = 'client' | 'sp' | 'admin' | null;

type RoleCtx = {
  role: Role;
  setRole: (r: Role) => void;
  logout: () => void;
};

const RoleContext = createContext<RoleCtx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(
    () => (localStorage.getItem('role') as Role) || null
  );

  const setRole = (r: Role) => {
    setRoleState(r);
    if (r) localStorage.setItem('role', r);
    else localStorage.removeItem('role');
  };

  const logout = () => {
    setRole(null);
    localStorage.removeItem('clientId');
    localStorage.removeItem('spId');
  };

  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.body.dataset.theme = role ?? 'sp';

    const titles: Record<Exclude<Role, null>, string> = {
      client: 'Home Assist — Client',
      sp: 'Home Assist — Service Provider',
      admin: 'Home Assist — Admin',
    };

    document.title = role ? titles[role] : 'Home Assist';
  }, [role]);

  const value = useMemo(() => ({ role, setRole, logout }), [role]);

  return (
    <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within RoleProvider');
  return ctx;
}
