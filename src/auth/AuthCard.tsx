import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="min-h-screen bg-[#f6f6f6] flex flex-col">
      <header className="px-6 py-5">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 bg-black rounded-full flex items-center justify-center">
            <Home className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight text-black">Home Assist</span>
        </Link>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 pt-8 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-black mb-2">{title}</h1>
            {subtitle && <p className="text-[#6b6b6b] text-base">{subtitle}</p>}
          </div>
          <div className="bg-white rounded-2xl ha-shadow p-6 sm:p-8 border border-black/5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
