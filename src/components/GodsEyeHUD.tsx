import React, { useState, useEffect } from 'react';
import { 
  Crosshair, 
  Compass, 
  Activity, 
  Radio, 
  Eye, 
  Maximize2,
  Navigation,
  ShieldCheck
} from 'lucide-react';

interface GodsEyeHUDProps {
  active: boolean;
  mapCenter: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  territoryCode: string;
}

export const GodsEyeHUD: React.FC<GodsEyeHUDProps> = ({
  active,
  mapCenter,
  zoom,
  pitch,
  bearing,
  territoryCode
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(' ')[0] + ' UTC' + (now.getTimezoneOffset() > 0 ? '-' : '+') + Math.abs(now.getTimezoneOffset() / 60));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!active) return null;

  const lat = mapCenter[1];
  const lon = mapCenter[0];

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden font-mono-tactical text-teal-400 select-none">
      {/* Tactical Corner Brackets */}
      <div className="absolute top-16 left-3 w-8 h-8 reticle-corner-tl opacity-70" />
      <div className="absolute top-16 right-3 w-8 h-8 reticle-corner-tr opacity-70" />
      <div className="absolute bottom-14 left-3 w-8 h-8 reticle-corner-bl opacity-70" />
      <div className="absolute bottom-14 right-3 w-8 h-8 reticle-corner-br opacity-70" />

      {/* Top HUD Telemetry Banner */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-3 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-teal-500/40 text-[10px] tracking-widest text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
        <span className="flex items-center gap-1.5 font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          GOD'S EYE TACTICAL
        </span>
        <span className="text-slate-600">|</span>
        <span className="text-slate-300">DOM-SDQ-{territoryCode || '01'}</span>
        <span className="text-slate-600">|</span>
        <span className="text-emerald-400">{currentTime}</span>
        <span className="text-slate-600">|</span>
        <span className="text-teal-400">FPS: 60</span>
      </div>

      {/* Center Target Reticle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-teal-500/30 rounded-full flex items-center justify-center pointer-events-none opacity-60">
        <div className="w-2 h-2 rounded-full bg-teal-400/80 animate-ping" />
        <div className="absolute w-6 h-px bg-teal-400/70" />
        <div className="absolute h-6 w-px bg-teal-400/70" />
        <div className="absolute -top-3 text-[9px] tracking-wider text-teal-300/80">RECON</div>
      </div>

      {/* Bottom-right Tactical Data Box */}
      <div className="absolute bottom-16 right-4 hidden md:flex flex-col gap-0.5 p-2.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-teal-500/30 text-[10px] text-teal-300/90 shadow-lg">
        <div className="flex justify-between gap-4 font-semibold text-teal-400 border-b border-teal-500/20 pb-1 mb-1">
          <span>SANTO DOMINGO GEO-TELEMETRY</span>
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">LATITUD:</span>
          <span className="font-bold text-white">{lat.toFixed(5)}° N</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">LONGITUD:</span>
          <span className="font-bold text-white">{Math.abs(lon).toFixed(5)}° W</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">ZOOM:</span>
          <span className="font-bold text-white">{zoom.toFixed(1)}x</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">PITCH (INCLINACIÓN):</span>
          <span className="font-bold text-white">{Math.round(pitch)}°</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">BEARING (RUMBO):</span>
          <span className="font-bold text-white">{Math.round(bearing)}°</span>
        </div>
      </div>
    </div>
  );
};
