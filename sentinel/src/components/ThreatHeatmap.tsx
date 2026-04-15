import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Clock, Layers } from 'lucide-react';
import { cn } from '../lib/utils';

interface ThreatHeatmapProps {
  incidents: any[];
  officers: any[];
}

const SEVERITY_WEIGHT: Record<string, number> = { low: 0.3, medium: 0.6, high: 0.85, critical: 1.0 };
const TIME_FILTERS = [
  { label: '1H', hours: 1 },
  { label: '6H', hours: 6 },
  { label: '24H', hours: 24 },
  { label: '7D', hours: 168 },
  { label: 'ALL', hours: Infinity },
];

export default function ThreatHeatmap({ incidents, officers }: ThreatHeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [timeFilter, setTimeFilter] = useState(168);
  const [showOfficers, setShowOfficers] = useState(true);
  const [hoveredIncident, setHoveredIncident] = useState<any>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Filter incidents by time window
  const filteredIncidents = incidents.filter(inc => {
    if (!inc.latitude || !inc.longitude || inc.latitude === 0) return false;
    if (timeFilter === Infinity) return true;
    const created = inc.created_at?.toDate?.() || new Date(0);
    const hoursAgo = (Date.now() - created.getTime()) / 3600000;
    return hoursAgo <= timeFilter;
  });

  const activeOfficers = officers.filter(o => o.status !== 'off_duty' && o.latitude && o.latitude !== 0);

  useEffect(() => {
    drawHeatmap();
  }, [filteredIncidents, showOfficers, timeFilter]);

  const drawHeatmap = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark background
    ctx.fillStyle = '#0a0e1a';
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.06)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (filteredIncidents.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO INCIDENT DATA FOR THIS TIME WINDOW', W / 2, H / 2);
      return;
    }

    // Compute lat/lng bounds
    const lats = filteredIncidents.map(i => i.latitude);
    const lngs = filteredIncidents.map(i => i.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;
    const PAD = 60;

    const toCanvas = (lat: number, lng: number) => ({
      x: PAD + ((lng - minLng) / lngRange) * (W - PAD * 2),
      y: H - PAD - ((lat - minLat) / latRange) * (H - PAD * 2),
    });

    // Draw heat blobs
    filteredIncidents.forEach(inc => {
      const w = SEVERITY_WEIGHT[inc.severity] || 0.5;
      const { x, y } = toCanvas(inc.latitude, inc.longitude);
      const radius = 30 + w * 60;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const color = inc.severity === 'critical' ? '239,68,68' :
                    inc.severity === 'high' ? '249,115,22' :
                    inc.severity === 'medium' ? '245,158,11' : '59,130,246';
      gradient.addColorStop(0, `rgba(${color},${0.5 * w})`);
      gradient.addColorStop(0.5, `rgba(${color},${0.2 * w})`);
      gradient.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw incident dots
    filteredIncidents.forEach(inc => {
      const { x, y } = toCanvas(inc.latitude, inc.longitude);
      const color = inc.severity === 'critical' ? '#ef4444' :
                    inc.severity === 'high' ? '#f97316' :
                    inc.severity === 'medium' ? '#f59e0b' : '#3b82f6';

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#0a0e1a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Draw officer positions
    if (showOfficers) {
      activeOfficers.forEach(off => {
        if (off.latitude === 0) return;
        const { x, y } = toCanvas(off.latitude, off.longitude);

        // Ping ring
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(16,185,129,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.strokeStyle = '#0a0e1a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(16,185,129,0.9)';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(off.badge_number || 'OFF', x, y - 12);
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || filteredIncidents.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    setMousePos({ x: e.clientX, y: e.clientY });

    const W = canvas.width, H = canvas.height;
    const lats = filteredIncidents.map(i => i.latitude);
    const lngs = filteredIncidents.map(i => i.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 0.01;
    const lngRange = maxLng - minLng || 0.01;
    const PAD = 60;

    const toCanvas = (lat: number, lng: number) => ({
      x: PAD + ((lng - minLng) / lngRange) * (W - PAD * 2),
      y: H - PAD - ((lat - minLat) / latRange) * (H - PAD * 2),
    });

    const hit = filteredIncidents.find(inc => {
      const { x, y } = toCanvas(inc.latitude, inc.longitude);
      return Math.hypot(mx - x, my - y) < 12;
    });
    setHoveredIncident(hit || null);
  };

  const stats = {
    critical: filteredIncidents.filter(i => i.severity === 'critical').length,
    high: filteredIncidents.filter(i => i.severity === 'high').length,
    resolved: filteredIncidents.filter(i => i.status === 'Resolved').length,
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Time Window:</span>
          <div className="flex gap-1">
            {TIME_FILTERS.map(f => (
              <button
                key={f.label}
                onClick={() => setTimeFilter(f.hours)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                  timeFilter === f.hours
                    ? 'bg-brand-blue text-white'
                    : 'bg-white/5 text-gray-500 hover:bg-white/10'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowOfficers(!showOfficers)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border',
            showOfficers
              ? 'bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald'
              : 'bg-white/5 border-white/10 text-gray-500'
          )}
        >
          <Layers className="w-3 h-3" />
          Officers
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: filteredIncidents.length, color: 'text-white' },
          { label: 'Critical', value: stats.critical, color: 'text-brand-red' },
          { label: 'High', value: stats.high, color: 'text-orange-400' },
          { label: 'Resolved', value: stats.resolved, color: 'text-brand-emerald' },
        ].map(s => (
          <div key={s.label} className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
            <p className={cn('text-xl font-display font-black', s.color)}>{s.value}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Canvas Map */}
      <div ref={containerRef} className="relative bg-brand-dark rounded-2xl border border-white/5 overflow-hidden" style={{ height: 420 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIncident(null)}
        />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 glass-card px-4 py-3 space-y-1.5 rounded-xl">
          {[
            { label: 'Critical', color: 'bg-brand-red' },
            { label: 'High', color: 'bg-orange-500' },
            { label: 'Medium', color: 'bg-brand-amber' },
            { label: 'Low', color: 'bg-brand-blue' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full', l.color)} />
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">{l.label}</span>
            </div>
          ))}
          {showOfficers && (
            <div className="flex items-center gap-2 pt-1 border-t border-white/10">
              <div className="w-2 h-2 rounded-full bg-brand-emerald" />
              <span className="text-[9px] font-black uppercase tracking-widest text-brand-emerald">Officers</span>
            </div>
          )}
        </div>

        {/* Empty state */}
        {filteredIncidents.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <MapPin className="w-10 h-10 text-gray-700" />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-700">No geolocation data in this window</p>
          </div>
        )}

        {/* Hover tooltip */}
        {hoveredIncident && (
          <div
            className="fixed z-50 glass-card px-3 py-2 rounded-xl pointer-events-none text-[10px] space-y-0.5 border-white/20"
            style={{ left: mousePos.x + 12, top: mousePos.y - 30 }}
          >
            <p className="font-black text-white uppercase">{hoveredIncident.type}</p>
            <p className="text-gray-500 font-mono">{hoveredIncident.severity?.toUpperCase()} · {hoveredIncident.status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
