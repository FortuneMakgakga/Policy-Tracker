import React from "react";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-2 text-center">{title}</h1>
        {subtitle && (
          <p className="text-gray-500 text-center text-sm mb-6">{subtitle}</p>
        )}
        {children}
      </div>
    </div>
  );
}