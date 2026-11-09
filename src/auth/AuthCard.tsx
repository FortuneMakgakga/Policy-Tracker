import type { ReactNode } from 'react';

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 px-4">
      <div className="bg-gray-900 border border-gray-800 shadow-xl rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center text-white">{title}</h1>
        {subtitle && (
          <p className="text-gray-400 text-center text-sm mb-6">{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  );
}
