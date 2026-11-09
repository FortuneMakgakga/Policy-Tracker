import { API_BASE } from "@/lib/api";

// Temporary stub during migration - will restore full component
export function SPJobDetail() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <p>SPJobDetail temporarily simplified during API_BASE migration.</p>
      <p className="text-gray-400 text-sm mt-2">API: {API_BASE}</p>
    </div>
  );
}
