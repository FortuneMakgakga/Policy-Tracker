import { useEffect, useRef } from "react";

interface MapViewProps {
  center: [number, number];
  zoom?: number;
  markers?: Array<{
    position: [number, number];
    label: string;
    type: "client" | "provider" | "job";
    onClick?: () => void;
  }>;
  polyline?: Array<[number, number]>;
  className?: string;
}

export function MapView({
  center,
  zoom = 13,
  markers = [],
  polyline,
  className = "",
}: MapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const [lat, lon] = center;
    const tileSize = 256;
    const z = zoom;
    const n = Math.pow(2, z);

    const lon2tile = (lon: number) => ((lon + 180) / 360) * n;
    const lat2tile = (lat: number) =>
      ((1 -
        Math.log(
          Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
        ) /
          Math.PI) /
        2) *
      n;

    const xtileCenter = lon2tile(lon);
    const ytileCenter = lat2tile(lat);

    const tilesX = Math.ceil(rect.width / tileSize) + 2;
    const tilesY = Math.ceil(rect.height / tileSize) + 2;

    const startX = Math.floor(xtileCenter - tilesX / 2);
    const startY = Math.floor(ytileCenter - tilesY / 2);

    const offsetX =
      ((startX - xtileCenter) * tileSize + rect.width / 2) | 0;
    const offsetY =
      ((startY - ytileCenter) * tileSize + rect.height / 2) | 0;

    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, rect.width, rect.height);

    const drawTile = (x: number, y: number, img: HTMLImageElement) => {
      const dx = (x - startX) * tileSize + offsetX;
      const dy = (y - startY) * tileSize + offsetY;
      ctx.drawImage(img, dx, dy, tileSize, tileSize);
    };

    for (let x = startX; x < startX + tilesX; x++) {
      for (let y = startY; y < startY + tilesY; y++) {
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
        img.onload = () => drawTile(x, y, img);
      }
    }

    const project = (lat: number, lon: number): [number, number] => {
      const x = lon2tile(lon);
      const y = lat2tile(lat);
      const px = (x - xtileCenter) * tileSize + rect.width / 2;
      const py = (y - ytileCenter) * tileSize + rect.height / 2;
      return [px, py];
    };

    const drawMarker = (
      x: number,
      y: number,
      color: string,
      label: string
    ) => {
      const markerImg = new Image();
      markerImg.src =
        "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/marker-icon-2x-blue.png";
      markerImg.onload = () => {
        ctx.drawImage(markerImg, x - 12, y - 40, 25, 41);
        // Label background
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(x - 30, y - 55, ctx.measureText(label).width + 60, 18);
        // Label text
        ctx.fillStyle = "#fff";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, x, y - 42);
      };
    };

    // Draw polyline
    if (polyline && polyline.length > 0) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 4;
      ctx.beginPath();
      polyline.forEach((p, i) => {
        const [x, y] = project(p[0], p[1]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Draw markers using OSM pin icons
    markers.forEach((m) => {
      const [x, y] = project(m.position[0], m.position[1]);
      let color = "blue";
      if (m.type === "client") color = "green";
      else if (m.type === "job") color = "orange";

      const baseUrl =
        "https://cdn.jsdelivr.net/gh/pointhi/leaflet-color-markers@master/img/";
      const colorMap: Record<string, string> = {
        blue: "marker-icon-2x-blue.png",
        green: "marker-icon-2x-green.png",
        orange: "marker-icon-2x-orange.png",
      };

      const markerImg = new Image();
      markerImg.src = baseUrl + colorMap[color];
      markerImg.onload = () => ctx.drawImage(markerImg, x - 12, y - 40, 25, 41);

      // Optional label
      ctx.fillStyle = "white";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(m.label, x, y - 48);
    });
  }, [center, zoom, markers, polyline]);

  return (
    <div className={`relative w-full h-full bg-gray-800 rounded-lg overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-4 bg-gray-900/90 border border-gray-700 rounded-lg p-3 text-xs text-white space-y-1">
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-full"></div> Provider</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Client</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-500 rounded-full"></div> Job</div>
      </div>
    </div>
  );
}
