import { useRole } from '@/auth/RoleProvider';

export default function Login() {
  const { setRole } = useRole();
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="card" style={{ maxWidth: 420 }}>
        <h2>Choose a role</h2>
        <div className="mt-4 grid gap-2">
          <button onClick={() => setRole('client')}>Continue as Client</button>
          <button onClick={() => setRole('sp')}>Continue as Service Provider</button>
          <button onClick={() => setRole('admin')}>Continue as Admin</button>
        </div>
      </div>
    </div>
  );
}
