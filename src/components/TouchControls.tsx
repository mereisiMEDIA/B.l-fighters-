import React, { useCallback } from 'react';
import { TouchInputManager, TouchInputState } from '../game/input/InputSource';

interface TouchControlsProps {
  superMeter: number;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ superMeter }) => {
  const manager = TouchInputManager.getInstance();
  const isLvl1Ready = superMeter >= 100;
  const isLvl2Ready = superMeter >= 200;
  const isLvl3Ready = superMeter >= 300;

  const handlePress = useCallback(
    (btn: keyof TouchInputState, active: boolean) => {
      manager.setButton(btn, active);
    },
    [manager]
  );

  const makeBtnHandlers = (btn: keyof TouchInputState) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore if not supported
      }
      handlePress(btn, true);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
      handlePress(btn, false);
    },
    onPointerLeave: (e: React.PointerEvent<HTMLButtonElement>) => {
      // If not captured, release on pointerleave
      if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        handlePress(btn, false);
      }
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      handlePress(btn, false);
    },
    onLostPointerCapture: () => {
      handlePress(btn, false);
    },
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
    },
    style: { touchAction: 'none' } as React.CSSProperties,
  });

  return (
    <div
      style={{ touchAction: 'none' }}
      className="absolute inset-x-0 bottom-2 md:bottom-4 px-2 md:px-6 flex justify-between items-end pointer-events-none select-none z-20"
    >
      {/* Left side: D-Pad (Semi-transparent with press-and-hold) */}
      <div
        style={{ touchAction: 'none' }}
        className="pointer-events-auto bg-slate-950/40 hover:bg-slate-950/60 backdrop-blur-sm p-1.5 md:p-2 rounded-2xl border border-white/10 shadow-xl flex flex-col items-center opacity-75 hover:opacity-95 active:opacity-100 transition-opacity"
      >
        {/* Jump / Up */}
        <button
          {...makeBtnHandlers('up')}
          aria-label="Jump Up"
          className="w-11 h-11 md:w-13 md:h-13 bg-slate-900/50 hover:bg-slate-800/70 active:bg-blue-600/80 active:scale-95 text-slate-200 rounded-xl flex items-center justify-center font-arcade text-base border border-white/15 shadow transition-all select-none"
        >
          ▲
        </button>
        {/* Left, Down, Right */}
        <div className="flex gap-2.5 my-1" style={{ touchAction: 'none' }}>
          <button
            {...makeBtnHandlers('left')}
            aria-label="Move Left / Walk Back"
            className="w-11 h-11 md:w-13 md:h-13 bg-slate-900/50 hover:bg-slate-800/70 active:bg-blue-600/80 active:scale-95 text-slate-200 rounded-xl flex items-center justify-center font-arcade text-base border border-white/15 shadow transition-all select-none"
          >
            ◀
          </button>
          <button
            {...makeBtnHandlers('down')}
            aria-label="Crouch"
            className="w-11 h-11 md:w-13 md:h-13 bg-slate-900/50 hover:bg-slate-800/70 active:bg-blue-600/80 active:scale-95 text-slate-200 rounded-xl flex items-center justify-center font-arcade text-base border border-white/15 shadow transition-all select-none"
          >
            ▼
          </button>
          <button
            {...makeBtnHandlers('right')}
            aria-label="Move Right / Walk Forward"
            className="w-11 h-11 md:w-13 md:h-13 bg-slate-900/50 hover:bg-slate-800/70 active:bg-blue-600/80 active:scale-95 text-slate-200 rounded-xl flex items-center justify-center font-arcade text-base border border-white/15 shadow transition-all select-none"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Right side: Action Buttons Cluster (Semi-transparent) */}
      <div
        style={{ touchAction: 'none' }}
        className="pointer-events-auto bg-slate-950/40 hover:bg-slate-950/60 backdrop-blur-sm p-1.5 md:p-2 rounded-2xl border border-white/10 shadow-xl flex flex-col items-end gap-1.5 opacity-75 hover:opacity-95 active:opacity-100 transition-opacity"
      >
        {/* Top row: Block & 3 Super Buttons (S1, S2, S3) */}
        <div className="flex items-center gap-1.5 md:gap-2" style={{ touchAction: 'none' }}>
          <button
            {...makeBtnHandlers('block')}
            aria-label="Block"
            className="px-2 md:px-2.5 h-8 md:h-9 bg-indigo-950/50 hover:bg-indigo-900/70 active:bg-indigo-600/80 text-indigo-200 rounded-lg flex items-center justify-center font-arcade text-[10px] md:text-xs border border-indigo-400/30 shadow active:scale-95 transition-all select-none"
          >
            🛡️ BLOCK
          </button>

          {/* S1: Level 1 Super Button */}
          <button
            {...makeBtnHandlers('super1')}
            aria-label="Super Level 1"
            disabled={!isLvl1Ready}
            className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center font-arcade text-[10px] md:text-xs border shadow active:scale-90 transition-all select-none ${
              isLvl1Ready
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black border-yellow-300 shadow-[0_0_10px_#eab308] animate-pulse cursor-pointer'
                : 'bg-slate-900/40 text-slate-500 border-white/10 cursor-not-allowed opacity-40'
            }`}
          >
            S1
          </button>

          {/* S2: Level 2 Super Button */}
          <button
            {...makeBtnHandlers('super2')}
            aria-label="Super Level 2"
            disabled={!isLvl2Ready}
            className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center font-arcade text-[10px] md:text-xs border shadow active:scale-90 transition-all select-none ${
              isLvl2Ready
                ? 'bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 font-black border-cyan-300 shadow-[0_0_12px_#06b6d4] animate-pulse cursor-pointer'
                : 'bg-slate-900/40 text-slate-500 border-white/10 cursor-not-allowed opacity-40'
            }`}
          >
            S2
          </button>

          {/* S3: Level 3 Super Button */}
          <button
            {...makeBtnHandlers('super3')}
            aria-label="Super Level 3 (Ultimate)"
            disabled={!isLvl3Ready}
            className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center font-arcade text-[10px] md:text-xs border shadow active:scale-90 transition-all select-none ${
              isLvl3Ready
                ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white font-black border-pink-300 shadow-[0_0_16px_#ec4899] animate-pulse cursor-pointer'
                : 'bg-slate-900/40 text-slate-500 border-white/10 cursor-not-allowed opacity-40'
            }`}
          >
            S3
          </button>
        </div>

        {/* 2x2 Fighting Buttons: LP, HP, LK, HK */}
        <div className="grid grid-cols-2 gap-2" style={{ touchAction: 'none' }}>
          {/* Light Punch */}
          <button
            {...makeBtnHandlers('lightPunch')}
            aria-label="Light Punch"
            className="w-12 h-12 md:w-14 md:h-14 bg-blue-600/40 hover:bg-blue-600/60 active:bg-blue-500/90 active:scale-90 text-white rounded-xl flex flex-col items-center justify-center font-arcade border border-blue-400/30 shadow transition-all select-none"
          >
            <span className="text-xs md:text-sm font-extrabold">LP</span>
            <span className="text-[8px] text-blue-200 font-sans">Jab</span>
          </button>

          {/* Heavy Punch */}
          <button
            {...makeBtnHandlers('heavyPunch')}
            aria-label="Heavy Punch"
            className="w-12 h-12 md:w-14 md:h-14 bg-rose-600/40 hover:bg-rose-600/60 active:bg-rose-500/90 active:scale-90 text-white rounded-xl flex flex-col items-center justify-center font-arcade border border-rose-400/30 shadow transition-all select-none"
          >
            <span className="text-xs md:text-sm font-extrabold">HP</span>
            <span className="text-[8px] text-rose-200 font-sans">Bonk</span>
          </button>

          {/* Light Kick */}
          <button
            {...makeBtnHandlers('lightKick')}
            aria-label="Light Kick"
            className="w-12 h-12 md:w-14 md:h-14 bg-emerald-600/40 hover:bg-emerald-600/60 active:bg-emerald-500/90 active:scale-90 text-white rounded-xl flex flex-col items-center justify-center font-arcade border border-emerald-400/30 shadow transition-all select-none"
          >
            <span className="text-xs md:text-sm font-extrabold">LK</span>
            <span className="text-[8px] text-emerald-200 font-sans">Punt</span>
          </button>

          {/* Heavy Kick */}
          <button
            {...makeBtnHandlers('heavyKick')}
            aria-label="Heavy Kick"
            className="w-12 h-12 md:w-14 md:h-14 bg-amber-600/40 hover:bg-amber-600/60 active:bg-amber-500/90 active:scale-90 text-white rounded-xl flex flex-col items-center justify-center font-arcade border border-amber-400/30 shadow transition-all select-none"
          >
            <span className="text-xs md:text-sm font-extrabold">HK</span>
            <span className="text-[8px] text-amber-200 font-sans">Yeet</span>
          </button>
        </div>
      </div>
    </div>
  );
};
