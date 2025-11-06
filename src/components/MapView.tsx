import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, User } from 'lucide-react';

interface MapViewProps {
  center: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    label: string;
    type: 'client' | 'provider' | 'job';
    onClick?: () => void;
  }>;
  polyline?: Array<[number, number]>;
  className?: string;
}

export function MapView({ center, zoom = 13, markers = [], polyline, className = '' }: MapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredMarker, setHoveredMarker] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Dark background
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw grid for map appearance
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < rect.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    for (let y = 0; y < rect.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(rect.width, y);
      ctx.stroke();
    }

    // Calculate bounds for all points
    const allPoints = [...markers.map(m => m.position)];
    if (polyline && polyline.length > 0) {
      allPoints.push(...polyline);
    }

    if (allPoints.length === 0) return;

    const lats = allPoints.map(p => p[0]);
    const lngs = allPoints.map(p => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;

    // Add padding
    const padding = 60;
    const mapWidth = rect.width - padding * 2;
    const mapHeight = rect.height - padding * 2;

    // Convert lat/lng to canvas coordinates
    const toCanvasCoords = (lat: number, lng: number): [number, number] => {
      const x = padding + ((lng - minLng) / lngRange) * mapWidth;
      const y = padding + ((maxLat - lat) / latRange) * mapHeight;
      return [x, y];
    };

    // Draw polyline (route)
    if (polyline && polyline.length > 0) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      
      polyline.forEach((point, index) => {
        const [x, y] = toCanvasCoords(point[0], point[1]);
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw route glow
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.lineWidth = 8;
      ctx.stroke();
    }

    // Draw markers
    markers.forEach((marker, index) => {
      const [x, y] = toCanvasCoords(marker.position[0], marker.position[1]);

      // Draw marker shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(x, y + 2, marker.type === 'provider' ? 20 : 16, 0, Math.PI * 2);
      ctx.fill();

      // Draw marker
      if (marker.type === 'provider') {
        // Provider marker (blue with person icon)
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
        gradient.addColorStop(0, '#60a5fa');
        gradient.addColorStop(1, '#3b82f6');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();

        // White dot in center
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (marker.type === 'client') {
        // Client marker (green)
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 16);
        gradient.addColorStop(0, '#34d399');
        gradient.addColorStop(1, '#10b981');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        // Job marker (amber)
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 16);
        gradient.addColorStop(0, '#fbbf24');
        gradient.addColorStop(1, '#f59e0b');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });
  }, [markers, polyline, center, zoom]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate bounds for coordinate conversion
    const allPoints = [...markers.map(m => m.position)];
    if (polyline && polyline.length > 0) {
      allPoints.push(...polyline);
    }

    if (allPoints.length === 0) return;

    const lats = allPoints.map(p => p[0]);
    const lngs = allPoints.map(p => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;

    const padding = 60;
    const mapWidth = rect.width - padding * 2;
    const mapHeight = rect.height - padding * 2;

    const toCanvasCoords = (lat: number, lng: number): [number, number] => {
      const cx = padding + ((lng - minLng) / lngRange) * mapWidth;
      const cy = padding + ((maxLat - lat) / latRange) * mapHeight;
      return [cx, cy];
    };

    // Check if click is near any marker
    markers.forEach((marker, index) => {
      const [mx, my] = toCanvasCoords(marker.position[0], marker.position[1]);
      const distance = Math.sqrt((x - mx) ** 2 + (y - my) ** 2);
      const radius = marker.type === 'provider' ? 20 : 16;

      if (distance <= radius && marker.onClick) {
        marker.onClick();
      }
    });
  };

  return (
    <div className={`relative w-full h-full bg-gray-800 rounded-lg overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        onClick={handleCanvasClick}
      />
      
      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white"></div>
          <span className="text-white text-xs">Provider</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
          <span className="text-white text-xs">Client</span>
        </div>
        {markers.some(m => m.type === 'job') && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-500 rounded-full border-2 border-white"></div>
            <span className="text-white text-xs">Job Location</span>
          </div>
        )}
      </div>

      {/* Marker Labels */}
      <div className="absolute top-4 right-4 space-y-2 max-w-xs">
        {markers.map((marker, index) => (
          <div
            key={index}
            className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-2 cursor-pointer hover:bg-gray-800/90 transition-colors"
            onClick={marker.onClick}
          >
            <div className="flex items-start gap-2">
              {marker.type === 'provider' ? (
                <User className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              ) : (
                <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              )}
              <span className="text-white text-xs">{marker.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
