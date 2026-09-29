import React, { useState } from 'react';
import { AVAILABLE_FIGHTERS } from '../game/fighters';

interface MoveListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MoveListModal: React.FC<MoveListModalProps> = ({ isOpen, onClose }) => {
  const [selectedFighter, setSelectedFighter] = useState(AVAILABLE_FIGHTERS[0].id);

  if (!isOpen) return null;

  const fighter = AVAILABLE_FIGHTERS.find((f) => f.id === selectedFighter) || AVAILABLE_FIGHTERS[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-yellow-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <h2 className="font-arcade text-xl md:text-2xl text-slate-950 font-black tracking-wide">
              HOW TO PLAY & MOVES GUIDE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-950/60 hover:bg-slate-950 text-white font-black flex items-center justify-center text-lg active:scale-90 transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-6 text-sm">
          {/* Controls Quick Reference */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
            <h3 className="font-arcade text-amber-400 text-sm tracking-wider uppercase mb-3 flex items-center gap-2">
              <span>🎮</span> Controls Reference
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm">
              <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-400">Move / Jump / Crouch</span>
                <span className="font-mono font-bold text-yellow-300">Arrow Keys / WASD</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-400">Dash Forward / Back</span>
                <span className="font-mono font-bold text-yellow-300">Double-tap ◀ / ▶</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-400">Light Punch (LP)</span>
                <span className="font-mono font-bold text-blue-400">A (or J)</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-400">Heavy Punch (HP / Bonk)</span>
                <span className="font-mono font-bold text-rose-400">S (or K)</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-400">Light Kick (LK)</span>
                <span className="font-mono font-bold text-emerald-400">D (or L)</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-400">Heavy Kick (HK / Yeet)</span>
                <span className="font-mono font-bold text-amber-400">F (or ;)</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-400">LV 1 Super (Cost 1)</span>
                <span className="font-mono font-bold text-yellow-400">↓ → + HP (or Tap SUPER)</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded border border-slate-800">
                <span className="text-slate-400">LV 2 Super (Cost 2)</span>
                <span className="font-mono font-bold text-cyan-400">↓ ← + HK (or ↓ + SUPER)</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded border border-slate-800 col-span-1 md:col-span-2">
                <span className="text-slate-400">LV 3 Ultimate (Cost 3)</span>
                <span className="font-mono font-bold text-pink-400">↓ ↓ + LP + HP (or Hold SUPER 1s)</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded border border-slate-800 col-span-1 md:col-span-2">
                <span className="text-slate-400">Block Guard</span>
                <span className="font-mono font-bold text-indigo-400">Hold Back or Shift</span>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 italic">
              * On mobile or touch screens, tap SUPER for LV1, hold Down + tap SUPER for LV2, or hold SUPER for 1 second for LV3 Ultimate!
            </div>
          </div>

          {/* Fighter Moves Tab */}
          <div>
            <div className="flex gap-2 mb-3">
              {AVAILABLE_FIGHTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFighter(f.id)}
                  className={`px-4 py-2 rounded-xl font-arcade text-xs md:text-sm tracking-wide transition ${
                    selectedFighter === f.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-lg'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>

            {/* Fighter Info Card */}
            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-baseline border-b border-slate-800 pb-2">
                <div>
                  <h4 className="font-arcade text-lg text-amber-300">{fighter.name}</h4>
                  <p className="text-xs text-slate-400">{fighter.subtitle}</p>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-400">Health: </span>
                  <span className="font-bold text-emerald-400">{fighter.stats.maxHealth}</span>
                  <span className="text-slate-400 ml-2">Power: </span>
                  <span className="font-bold text-rose-400">{(fighter.stats.powerMultiplier * 100).toFixed(0)}%</span>
                </div>
              </div>

              {/* Specials & Super Section */}
              {fighter.specials && fighter.specials.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-arcade text-xs text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 mt-2">
                    <span>⚡</span> Special Moves (Motion Commands)
                  </h5>
                  {fighter.specials.map((sp) => (
                    <div
                      key={sp.id}
                      className="p-2.5 rounded-lg border bg-cyan-950/20 border-cyan-800/40 flex flex-col md:flex-row md:items-center justify-between gap-1 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-arcade text-sm text-cyan-200">{sp.name}</span>
                          <span className="bg-cyan-500/30 text-cyan-300 font-mono font-bold text-[10px] px-2 py-0.5 rounded border border-cyan-400/40">
                            {sp.commandDisplay}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          {sp.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-rose-400 font-bold">Dmg: {sp.move.damage}</span>
                        <span className="text-cyan-400">+{sp.move.meterGain} Meter</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Combos Section */}
              {fighter.combos && fighter.combos.length > 0 && (
                <div className="space-y-2">
                  <h5 className="font-arcade text-xs text-amber-300 uppercase tracking-wider flex items-center gap-1.5 mt-2">
                    <span>🔥</span> Combo Chains (Cancel Active/Recovery Frames)
                  </h5>
                  {fighter.combos.map((cb) => (
                    <div
                      key={cb.id}
                      className="p-2.5 rounded-lg border bg-amber-950/20 border-amber-800/40 flex flex-col md:flex-row md:items-center justify-between gap-1 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-arcade text-sm text-amber-200">{cb.name}</span>
                          <span className="bg-amber-500/20 text-yellow-300 font-mono font-bold text-[10px] px-2 py-0.5 rounded border border-amber-400/40">
                            {cb.displayChain}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          Press {cb.nextButton} during {cb.fromMoveName} to cancel directly into the follow-up strike!
                        </div>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-rose-400 font-bold">Dmg: {cb.nextMove.damage}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 3-Tier Super Moves Section */}
              {fighter.supers && fighter.supers.length > 0 ? (
                <div className="space-y-2">
                  <h5 className="font-arcade text-xs text-yellow-300 uppercase tracking-wider flex items-center gap-1.5 mt-2">
                    <span>⭐</span> 3-Tier Super System
                  </h5>

                  {fighter.supers.map((sp) => {
                    const isLvl1 = sp.level === 1;
                    const isLvl2 = sp.level === 2;
                    const isLvl3 = sp.level === 3;

                    const bgClass = isLvl3
                      ? 'bg-pink-500/15 border-pink-500/50'
                      : isLvl2
                      ? 'bg-cyan-500/15 border-cyan-500/50'
                      : 'bg-yellow-500/15 border-yellow-500/50';

                    const badgeBg = isLvl3
                      ? 'bg-pink-400 text-slate-950'
                      : isLvl2
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-yellow-400 text-slate-950';

                    const nameColor = isLvl3 ? 'text-pink-200' : isLvl2 ? 'text-cyan-200' : 'text-yellow-200';
                    const cmdBorder = isLvl3
                      ? 'bg-pink-500/30 text-pink-200 border-pink-400/40'
                      : isLvl2
                      ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400/40'
                      : 'bg-yellow-500/30 text-yellow-200 border-yellow-400/40';

                    const costText = isLvl3
                      ? 'Cost: 3 Levels (300)'
                      : isLvl2
                      ? 'Cost: 2 Levels (200)'
                      : 'Cost: 1 Level (100)';

                    return (
                      <div
                        key={sp.id}
                        className={`p-3 rounded-lg border ${bgClass} flex flex-col md:flex-row md:items-center justify-between gap-1 text-xs`}
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-arcade text-sm ${nameColor}`}>{sp.name}</span>
                            <span className={`${badgeBg} font-black text-[9px] px-1.5 py-0.5 rounded`}>
                              {isLvl3 ? 'LV 3 ULTIMATE' : `LV ${sp.level} SUPER`}
                            </span>
                            <span className={`${cmdBorder} font-mono font-bold text-[10px] px-2 py-0.5 rounded border`}>
                              {sp.commandDisplay}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300 mt-1">
                            {sp.description}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[11px] shrink-0 mt-1 md:mt-0">
                          <span className="text-rose-400 font-bold">Dmg: {sp.move.damage}</span>
                          <span className={isLvl3 ? 'text-pink-300 font-bold' : isLvl2 ? 'text-cyan-300 font-bold' : 'text-yellow-400 font-bold'}>
                            {costText}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Basic Moves List */}
              <div className="space-y-2">
                <h5 className="font-arcade text-xs text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mt-2">
                  <span>🥊</span> Basic Moves
                </h5>
                {Object.values(fighter.moves).map((m) => (
                  <div
                    key={m.name}
                    className={`p-2.5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-1 text-xs ${
                      m.isSuper
                        ? 'bg-yellow-500/10 border-yellow-500/50'
                        : m.isHeavy
                        ? 'bg-rose-950/30 border-rose-800/40'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-arcade text-sm text-yellow-200">{m.name}</span>
                        {m.isSuper && (
                          <span className="bg-yellow-400 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded">
                            SUPER
                          </span>
                        )}
                        {m.isHeavy && !m.isSuper && (
                          <span className="bg-rose-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded">
                            HEAVY
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Type: {m.type.replace('_', ' ')} • Startup: {m.startupFrames}f • Hitbox: {m.hitboxes[0]?.humorText || 'SMACK!'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-rose-400">Dmg: {m.damage}</span>
                      <span className="text-cyan-400">Meter: +{m.meterGain}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quotes */}
              <div className="text-[11px] text-amber-200/80 bg-amber-950/20 p-2 rounded border border-amber-900/30">
                "{fighter.victoryQuote}"
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-arcade text-xs md:text-sm px-6 py-2.5 rounded-xl font-black shadow-lg active:scale-95 transition"
          >
            LET'S FIGHT!
          </button>
        </div>
      </div>
    </div>
  );
};
