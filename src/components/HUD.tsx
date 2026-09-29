import React from 'react';
import { GameState } from '../types/game';

interface HUDProps {
  state: GameState;
  isPortrait?: boolean;
  onOpenMoveList: () => void;
  onResetMatch: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  state,
  isPortrait = false,
  onOpenMoveList,
  isMuted,
  onToggleMute,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const { p1, p2, roundTimeRemaining, announcementText, announcementSubtext } = state;

  const p1HealthPercent = Math.max(0, (p1.health / p1.maxHealth) * 100);
  const p1DisplayPercent = Math.max(0, (p1.displayHealth / p1.maxHealth) * 100);
  const p2HealthPercent = Math.max(0, (p2.health / p2.maxHealth) * 100);
  const p2DisplayPercent = Math.max(0, (p2.displayHealth / p2.maxHealth) * 100);

  const p1Lvl1Percent = Math.min(100, Math.max(0, p1.superMeter));
  const p1Lvl2Percent = Math.min(100, Math.max(0, p1.superMeter - 100));
  const p1Lvl3Percent = Math.min(100, Math.max(0, p1.superMeter - 200));
  const p1Lvl1Full = p1.superMeter >= 100;
  const p1Lvl2Full = p1.superMeter >= 200;
  const p1Lvl3Full = p1.superMeter >= 300;

  const p2Lvl1Percent = Math.min(100, Math.max(0, p2.superMeter));
  const p2Lvl2Percent = Math.min(100, Math.max(0, p2.superMeter - 100));
  const p2Lvl3Percent = Math.min(100, Math.max(0, p2.superMeter - 200));
  const p2Lvl1Full = p2.superMeter >= 100;
  const p2Lvl2Full = p2.superMeter >= 200;
  const p2Lvl3Full = p2.superMeter >= 300;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-col justify-between p-1.5 md:p-3 z-10">
      {/* Top Header: Compact Health Bars & Timer */}
      <div className="w-full flex items-center justify-between gap-1.5 md:gap-3 max-w-5xl mx-auto bg-slate-950/40 backdrop-blur-xs p-1 md:p-2 rounded-xl border border-white/10 shadow-lg">
        {/* P1 Health & Info */}
        <div className="flex-1 flex flex-col items-start min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 w-full">
            <span className="font-arcade text-xs md:text-base text-amber-300 arcade-text-shadow truncate">
              {p1.config.name}
            </span>
            <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wider bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700">
              P1
            </span>
            {/* Round win dots */}
            <div className="flex gap-1 ml-auto md:ml-2">
              {[...Array(state.targetWins)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border border-yellow-400/80 transition-all duration-300 ${
                    i < p1.roundsWon
                      ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]'
                      : 'bg-slate-900/80'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Slim Health Bar */}
          <div className="w-full h-3.5 md:h-4.5 bg-slate-950/90 rounded border border-slate-700 overflow-hidden relative shadow-inner p-0.5">
            {/* Yellow damage trail */}
            <div
              className="absolute top-0.5 bottom-0.5 left-0.5 bg-yellow-400 transition-all duration-500 ease-out rounded-xs"
              style={{ width: `${p1DisplayPercent}%` }}
            />
            {/* Green/Red actual health */}
            <div
              className={`absolute top-0.5 bottom-0.5 left-0.5 transition-all duration-75 rounded-xs ${
                p1HealthPercent > 40
                  ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                  : p1HealthPercent > 20
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-400'
                  : 'bg-gradient-to-r from-red-600 to-rose-500 animate-pulse'
              }`}
              style={{ width: `${p1HealthPercent}%` }}
            />
          </div>

          {/* P1 3-Segment Super Meter */}
          <div className="w-full mt-1 flex items-center gap-1.5">
            <span
              className={`font-arcade text-[9px] md:text-[11px] font-bold shrink-0 ${
                p1Lvl3Full
                  ? 'text-pink-300 animate-bounce'
                  : p1Lvl2Full
                  ? 'text-cyan-300 animate-pulse'
                  : p1Lvl1Full
                  ? 'text-yellow-300 animate-pulse'
                  : 'text-slate-400'
              }`}
            >
              {p1Lvl3Full
                ? '💖 LV 3 ULTIMATE!'
                : p1Lvl2Full
                ? '⚡ LV 2 SUPER!'
                : p1Lvl1Full
                ? '⭐ LV 1 SUPER!'
                : 'SUPER METER'}
            </span>
            <div className="flex-1 grid grid-cols-3 gap-1">
              {/* Segment 1 (Level 1) */}
              <div
                className={`h-2 md:h-2.5 bg-slate-950/90 rounded-xs border relative overflow-hidden transition-all duration-300 ${
                  p1Lvl1Full
                    ? 'border-yellow-400 shadow-[0_0_8px_#eab308]'
                    : 'border-slate-800'
                }`}
              >
                <div
                  className={`h-full transition-all duration-75 ${
                    p1Lvl1Full
                      ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-yellow-400'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                  }`}
                  style={{ width: `${p1Lvl1Percent}%` }}
                />
              </div>

              {/* Segment 2 (Level 2) */}
              <div
                className={`h-2 md:h-2.5 bg-slate-950/90 rounded-xs border relative overflow-hidden transition-all duration-300 ${
                  p1Lvl2Full
                    ? 'border-cyan-400 shadow-[0_0_8px_#06b6d4]'
                    : 'border-slate-800'
                }`}
              >
                <div
                  className={`h-full transition-all duration-75 ${
                    p1Lvl2Full
                      ? 'bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-400'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                  }`}
                  style={{ width: `${p1Lvl2Percent}%` }}
                />
              </div>

              {/* Segment 3 (Level 3) */}
              <div
                className={`h-2 md:h-2.5 bg-slate-950/90 rounded-xs border relative overflow-hidden transition-all duration-300 ${
                  p1Lvl3Full
                    ? 'border-pink-400 shadow-[0_0_12px_#ec4899] animate-pulse'
                    : 'border-slate-800'
                }`}
              >
                <div
                  className={`h-full transition-all duration-75 ${
                    p1Lvl3Full
                      ? 'bg-gradient-to-r from-pink-500 via-rose-300 to-pink-400'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-400'
                  }`}
                  style={{ width: `${p1Lvl3Percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Center Round Timer & Action Buttons */}
        <div className="flex flex-col items-center justify-center px-1">
          <div className="text-[9px] font-arcade text-slate-400 tracking-wider">
            R{state.roundNumber}
          </div>
          <div
            className={`font-arcade text-xl md:text-3xl px-2 py-0.5 bg-slate-950/90 rounded border shadow ${
              roundTimeRemaining <= 10
                ? 'text-red-500 border-red-600 animate-ping'
                : 'text-yellow-400 border-yellow-500/60'
            }`}
          >
            {roundTimeRemaining.toString().padStart(2, '0')}
          </div>
          <div className="flex gap-1 mt-0.5 pointer-events-auto">
            <button
              onClick={onOpenMoveList}
              aria-label="View Move List"
              className="text-[10px] bg-slate-800/90 hover:bg-slate-700 text-yellow-300 px-1.5 py-0.5 rounded border border-slate-600 font-bold active:scale-95 transition"
            >
              MOVES
            </button>
            <button
              onClick={onToggleMute}
              aria-label="Toggle Sound"
              className="text-[10px] bg-slate-800/90 hover:bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded border border-slate-600 active:scale-95 transition"
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <button
              onClick={onToggleFullscreen}
              aria-label="Toggle Fullscreen"
              className="text-[10px] bg-slate-800/90 hover:bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded border border-slate-600 active:scale-95 transition"
            >
              {isFullscreen ? '⤓' : '⤢'}
            </button>
          </div>
        </div>

        {/* P2 Health & Info */}
        <div className="flex-1 flex flex-col items-end min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 w-full justify-end">
            {/* Round win dots */}
            <div className="flex gap-1 mr-auto md:mr-2">
              {[...Array(state.targetWins)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border border-yellow-400/80 transition-all duration-300 ${
                    i < p2.roundsWon
                      ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]'
                      : 'bg-slate-900/80'
                  }`}
                />
              ))}
            </div>
            <span className="text-[9px] text-rose-300 font-bold uppercase tracking-wider bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700">
              CPU
            </span>
            <span className="font-arcade text-xs md:text-base text-cyan-300 arcade-text-shadow truncate">
              {p2.config.name}
            </span>
          </div>

          {/* Slim Health Bar */}
          <div className="w-full h-3.5 md:h-4.5 bg-slate-950/90 rounded border border-slate-700 overflow-hidden relative shadow-inner p-0.5">
            {/* Yellow trail */}
            <div
              className="absolute top-0.5 bottom-0.5 right-0.5 bg-yellow-400 transition-all duration-500 ease-out rounded-xs"
              style={{ width: `${p2DisplayPercent}%` }}
            />
            {/* Actual health */}
            <div
              className={`absolute top-0.5 bottom-0.5 right-0.5 transition-all duration-75 rounded-xs ${
                p2HealthPercent > 40
                  ? 'bg-gradient-to-l from-emerald-500 to-green-400'
                  : p2HealthPercent > 20
                  ? 'bg-gradient-to-l from-yellow-500 to-amber-400'
                  : 'bg-gradient-to-l from-red-600 to-rose-500 animate-pulse'
              }`}
              style={{ width: `${p2HealthPercent}%` }}
            />
          </div>

          {/* P2 3-Segment Super Meter */}
          <div className="w-full mt-1 flex items-center justify-end gap-1.5">
            <div className="flex-1 grid grid-cols-3 gap-1">
              {/* Segment 3 (Level 3) */}
              <div
                className={`h-2 md:h-2.5 bg-slate-950/90 rounded-xs border relative overflow-hidden transition-all duration-300 ${
                  p2Lvl3Full
                    ? 'border-pink-400 shadow-[0_0_12px_#ec4899] animate-pulse'
                    : 'border-slate-800'
                }`}
              >
                <div
                  className={`h-full ml-auto transition-all duration-75 ${
                    p2Lvl3Full
                      ? 'bg-gradient-to-l from-pink-500 via-rose-300 to-pink-400'
                      : 'bg-gradient-to-l from-rose-600 to-orange-400'
                  }`}
                  style={{ width: `${p2Lvl3Percent}%` }}
                />
              </div>

              {/* Segment 2 (Level 2) */}
              <div
                className={`h-2 md:h-2.5 bg-slate-950/90 rounded-xs border relative overflow-hidden transition-all duration-300 ${
                  p2Lvl2Full
                    ? 'border-cyan-400 shadow-[0_0_8px_#06b6d4]'
                    : 'border-slate-800'
                }`}
              >
                <div
                  className={`h-full ml-auto transition-all duration-75 ${
                    p2Lvl2Full
                      ? 'bg-gradient-to-l from-cyan-400 via-sky-300 to-cyan-400'
                      : 'bg-gradient-to-l from-rose-600 to-orange-400'
                  }`}
                  style={{ width: `${p2Lvl2Percent}%` }}
                />
              </div>

              {/* Segment 1 (Level 1) */}
              <div
                className={`h-2 md:h-2.5 bg-slate-950/90 rounded-xs border relative overflow-hidden transition-all duration-300 ${
                  p2Lvl1Full
                    ? 'border-yellow-400 shadow-[0_0_8px_#eab308]'
                    : 'border-slate-800'
                }`}
              >
                <div
                  className={`h-full ml-auto transition-all duration-75 ${
                    p2Lvl1Full
                      ? 'bg-gradient-to-l from-amber-400 via-yellow-300 to-yellow-400'
                      : 'bg-gradient-to-l from-rose-600 to-orange-400'
                  }`}
                  style={{ width: `${p2Lvl1Percent}%` }}
                />
              </div>
            </div>
            <span
              className={`font-arcade text-[9px] md:text-[11px] font-bold shrink-0 ${
                p2Lvl3Full
                  ? 'text-pink-300 animate-bounce'
                  : p2Lvl2Full
                  ? 'text-cyan-300 animate-pulse'
                  : p2Lvl1Full
                  ? 'text-yellow-300 animate-pulse'
                  : 'text-slate-400'
              }`}
            >
              {p2Lvl3Full
                ? '💖 LV 3 ULTIMATE!'
                : p2Lvl2Full
                ? '⚡ LV 2 SUPER!'
                : p2Lvl1Full
                ? '⭐ LV 1 SUPER!'
                : 'SUPER METER'}
            </span>
          </div>
        </div>
      </div>

      {/* Attacking Fighter Combo & Move Texts: Positioned just below top HUD header */}
      {/* P1 on left, P2/CPU on right. Font size ~half, never covering touch controls or fighters */}
      <div className="w-full flex justify-between px-3 mt-1.5 pointer-events-none max-w-5xl mx-auto">
        {/* P1 Combo & Attack on Left */}
        <div className="flex flex-col items-start min-h-[32px]">
          {p1.comboCount > 1 && (
            <div className="flex items-baseline gap-1.5 animate-pulse drop-shadow-md">
              <span className="font-comic text-sm sm:text-lg text-yellow-400 comic-text-shadow">
                {p1.comboCount} HITS!
              </span>
              <span className="font-arcade text-[9px] sm:text-[11px] text-amber-200 tracking-wider">
                COMBO!
              </span>
            </div>
          )}
        </div>

        {/* P2 / CPU Combo & Attack on Right */}
        <div className="flex flex-col items-end min-h-[32px]">
          {p2.comboCount > 1 && (
            <div className="flex items-baseline gap-1.5 animate-pulse drop-shadow-md">
              <span className="font-comic text-sm sm:text-lg text-rose-400 comic-text-shadow">
                {p2.comboCount} HITS!
              </span>
              <span className="font-arcade text-[9px] sm:text-[11px] text-rose-200 tracking-wider">
                COMBO!
              </span>
            </div>
          )}
        </div>
      </div>

      {/* White Flash Impact on KO Hit */}
      {state.whiteFlashTicks !== undefined && state.whiteFlashTicks > 0 && (
        <div
          className="absolute inset-0 z-30 pointer-events-none bg-white transition-opacity duration-75"
          style={{ opacity: Math.min(1, state.whiteFlashTicks / 10) }}
        />
      )}

      {/* Floating Comic Text Popups (BONK! OUCH! KAPOW!) - Single text at a time, clamped inside screen */}
      <div className="absolute inset-0 pointer-events-none">
        {(state.floatingTexts || []).slice(-1).map((txt) => {
          // X mapped from world coordinates [-6, 6] to safe percentage [16%, 84%]
          const leftPercent = Math.max(16, Math.min(84, ((txt.x + 6) / 12) * 100));
          // Y mapped from world coordinates [0, 3.5] to safe percentage [20%, 72%]
          const topPercent = Math.max(20, Math.min(72, 70 - (txt.y / 3.5) * 44));

          return (
            <div
              key={txt.id}
              className={`absolute font-comic font-black comic-text-shadow tracking-wide uppercase transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-75 max-w-[75vw] text-center whitespace-nowrap select-none ${
                isPortrait ? 'text-xs sm:text-sm' : 'text-base sm:text-xl md:text-2xl'
              }`}
              style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                color: txt.color,
                transform: `translate(-50%, -50%) scale(${txt.scale}) rotate(${txt.rotation}rad)`,
                opacity: Math.max(0, Math.min(1, txt.life / txt.maxLife)),
              }}
            >
              {txt.text}
            </div>
          );
        })}
      </div>

      {/* "DO THE MATH" Chalkboard Overlay with white chalk formulas and calculating lines */}
      {((state.p1.currentMove?.animType === 'do_the_math') || (state.p2.currentMove?.animType === 'do_the_math')) && (
        <div className="absolute inset-0 pointer-events-none z-15 overflow-hidden">
          <svg className="w-full h-full opacity-65 drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]">
            <line x1="12%" y1="68%" x2="88%" y2="32%" stroke="#ffffff" strokeWidth="2" strokeDasharray="6 6" />
            <line x1="22%" y1="22%" x2="78%" y2="78%" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="5 5" />
            <circle cx="50%" cy="48%" r="16%" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="6 6" opacity="0.7" />
          </svg>
          <div className="absolute top-[22%] left-[16%] font-mono text-white text-xs sm:text-lg font-black drop-shadow-[0_0_8px_#ffffff] animate-pulse">
            a² + b² = c²
          </div>
          <div className="absolute top-[32%] right-[18%] font-mono text-cyan-100 text-xs sm:text-lg font-black drop-shadow-[0_0_8px_#38bdf8]">
            π ≈ 3.14159
          </div>
          <div className="absolute bottom-[28%] left-[20%] font-mono text-yellow-100 text-xs sm:text-base font-black drop-shadow-[0_0_8px_#facc15]">
            E = mc²  |  θ = 45°
          </div>
          <div className="absolute bottom-[36%] right-[20%] font-mono text-white text-xs sm:text-base font-black drop-shadow-[0_0_8px_#ffffff]">
            f(x) = ∫ dx  |  √x / 2θ
          </div>
          <div className="absolute top-[18%] right-[32%] font-mono text-cyan-200 text-xs sm:text-sm font-bold drop-shadow-[0_0_6px_#38bdf8]">
            sin²(θ) + cos²(θ) = 1
          </div>
        </div>
      )}

      {/* Center Announcements ("ROUND 1", "FIGHT!", "K.O.!", "VICTORY!") - Wrapped to 2 lines and scaled */}
      {announcementText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 z-20">
          <div className="font-bungee text-3xl sm:text-5xl md:text-7xl text-yellow-400 arcade-text-shadow tracking-wider text-center max-w-[92vw] leading-tight animate-bounce drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
            {announcementText}
          </div>
          {announcementSubtext && (
            <div className="font-arcade text-xs sm:text-base md:text-2xl text-white comic-text-shadow tracking-wider uppercase mt-2 max-w-[90vw] text-center leading-snug">
              {(() => {
                if (announcementSubtext.includes(' WINS THE ROUND!')) {
                  const winnerName = announcementSubtext.replace(' WINS THE ROUND!', '');
                  return (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-yellow-300">{winnerName}</span>
                      <span>WINS THE ROUND!</span>
                    </div>
                  );
                }
                if (announcementSubtext.includes(' WINS BY HEALTH!')) {
                  const winnerName = announcementSubtext.replace(' WINS BY HEALTH!', '');
                  return (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-yellow-300">{winnerName}</span>
                      <span>WINS BY HEALTH!</span>
                    </div>
                  );
                }
                if (announcementSubtext.includes(' IS THE CHAMPION!')) {
                  const winnerName = announcementSubtext.replace(' IS THE CHAMPION!', '');
                  return (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-yellow-300">{winnerName}</span>
                      <span>IS THE CHAMPION!</span>
                    </div>
                  );
                }
                if (announcementSubtext.includes(' CLAIMS THE BELT!')) {
                  const winnerName = announcementSubtext.replace(' CLAIMS THE BELT!', '');
                  return (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-yellow-300">{winnerName}</span>
                      <span>CLAIMS THE BELT!</span>
                    </div>
                  );
                }
                return <span>{announcementSubtext}</span>;
              })()}
            </div>
          )}
        </div>
      )}

      {/* Super Move Cinematic: 40% opaque dark overlay, title at top of screen for only 1 sec then disappears */}
      {state.superCinematicTicks !== undefined && state.superCinematicTicks > 0 && (
        <div className="absolute inset-0 z-20 pointer-events-none bg-black/40 transition-opacity duration-300">
          {state.superTitleTicks !== undefined && state.superTitleTicks > 0 && state.superTitle && (
            <div className="absolute top-12 sm:top-14 md:top-16 inset-x-0 mx-auto max-w-2xl px-4 flex flex-col items-center text-center animate-pulse">
              <div className="font-bungee text-2xl sm:text-4xl md:text-5xl text-yellow-400 font-black tracking-wider arcade-text-shadow drop-shadow-[0_0_25px_rgba(250,204,21,0.9)] max-w-[90vw]">
                {state.superTitle.toUpperCase()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
