import React, { useState } from 'react';
import { FighterConfig } from '../types/game';
import { AVAILABLE_FIGHTERS } from '../game/fighters';
import { AIDifficulty } from '../game/input/InputSource';
import { GameRenderer } from '../game/renderer';
import { Fighter3DPreview } from './Fighter3DPreview';
import { FighterPortrait } from './FighterPortrait';

interface StartScreenProps {
  renderer: GameRenderer | null;
  initialDifficulty: AIDifficulty;
  onStartFight: (p1Fighter: FighterConfig, p2Fighter: FighterConfig, difficulty: AIDifficulty) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  renderer,
  initialDifficulty,
  onStartFight,
}) => {
  // Automatically loaded from fighters.js / fighters.ts
  const fighters = AVAILABLE_FIGHTERS;

  const [p1Id, setP1Id] = useState<string>(fighters[0]?.id || 'fighter_bob');
  const [p2Id, setP2Id] = useState<string>('RANDOM'); // Specific fighter ID or 'RANDOM'
  const [difficulty, setDifficulty] = useState<AIDifficulty>(initialDifficulty);

  // Selected P1 Fighter Config for the top 3D preview & stats
  const selectedP1 = fighters.find((f) => f.id === p1Id) || fighters[0];

  // Stats on consistent 1-10 scale for every fighter so fighters can be compared
  const healthVal = Math.max(1, Math.min(10, Math.round((selectedP1.stats.maxHealth / 1250) * 10)));
  const speedVal = Math.max(1, Math.min(10, Math.round((selectedP1.stats.walkSpeed / 0.12) * 10)));
  const powerVal = Math.max(1, Math.min(10, Math.round((selectedP1.stats.powerMultiplier / 1.35) * 10)));

  const handleFightClick = () => {
    let p2Fighter: FighterConfig;
    if (p2Id === 'RANDOM') {
      // Pick random opponent (prefer different from P1 if more than 1 fighter)
      const opponents = fighters.length > 1 ? fighters.filter((f) => f.id !== p1Id) : fighters;
      p2Fighter = opponents[Math.floor(Math.random() * opponents.length)];
    } else {
      p2Fighter = fighters.find((f) => f.id === p2Id) || fighters[1] || fighters[0];
    }

    onStartFight(selectedP1, p2Fighter, difficulty);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 select-none flex flex-col overflow-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.15)_0%,rgba(15,23,42,0.95)_70%)]" />

      {/* Main Scrolling Content: ends right after difficulty section with bottom padding matching the bottom bar */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center">
        <div className="relative z-10 w-full max-w-md px-3.5 pt-3 pb-[84px] flex flex-col items-center">
          {/* 1. Game Title at the Top */}
          <div className="text-center mb-2">
            <h1 className="font-bungee text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 tracking-wider drop-shadow-[0_2px_10px_rgba(245,158,11,0.6)]">
              B.L FIGHTERS
            </h1>
            <p className="font-arcade text-[10px] sm:text-xs text-amber-200/80 tracking-widest uppercase mt-0.5">
              ISRAELI STREET FIGHTING CHAMPIONSHIP
            </p>
          </div>

          {/* 2. Big 3D Preview of Selected Fighter & Stats */}
          <div className="w-full bg-slate-900/90 border border-amber-500/40 rounded-2xl p-2.5 shadow-xl shadow-amber-950/30 mb-4 backdrop-blur-sm">
            {/* Header info - 2-line wrap without cutoffs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 px-1 mb-2 gap-2">
              <div>
                <span className="text-[10px] font-arcade text-amber-400 font-bold uppercase tracking-wider block">
                  PLAYER 1 FIGHTER
                </span>
                <h2 className="font-bungee text-base sm:text-lg text-white leading-tight">
                  {selectedP1.name}
                </h2>
              </div>
              <div className="text-right max-w-[55%]">
                <span className="text-[10px] text-slate-300 italic block leading-snug line-clamp-2">
                  "{selectedP1.subtitle}"
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 3D Auto-Fitted Preview Window */}
              <div className="w-40 h-44 sm:w-44 sm:h-48 relative rounded-xl bg-slate-950/80 border border-amber-500/30 overflow-hidden shrink-0 shadow-inner flex items-center justify-center">
                <Fighter3DPreview fighter={selectedP1} renderer={renderer} />
                <div className="pointer-events-none absolute bottom-1 right-1.5 bg-slate-950/80 px-1.5 py-0.5 rounded text-[8px] font-arcade text-amber-400 border border-amber-500/30 flex items-center gap-1">
                  <span>3D VIEW</span>
                </div>
              </div>

              {/* Fighter Stats Bars on 1-10 Scale */}
              <div className="flex-1 space-y-2.5 pr-1">
                {/* Health Bar (1-10) */}
                <div>
                  <div className="flex justify-between items-center text-[10px] font-arcade text-slate-300 mb-0.5">
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <span>❤️</span> HEALTH
                    </span>
                    <span className="font-bold text-white bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                      {healthVal} / 10
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-300"
                      style={{ width: `${healthVal * 10}%` }}
                    />
                  </div>
                </div>

                {/* Speed Bar (1-10) */}
                <div>
                  <div className="flex justify-between items-center text-[10px] font-arcade text-slate-300 mb-0.5">
                    <span className="flex items-center gap-1 text-cyan-400 font-bold">
                      <span>⚡</span> SPEED
                    </span>
                    <span className="font-bold text-white bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                      {speedVal} / 10
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-400 rounded-full transition-all duration-300"
                      style={{ width: `${speedVal * 10}%` }}
                    />
                  </div>
                </div>

                {/* Power Bar (1-10) */}
                <div>
                  <div className="flex justify-between items-center text-[10px] font-arcade text-slate-300 mb-0.5">
                    <span className="flex items-center gap-1 text-rose-400 font-bold">
                      <span>🥊</span> POWER
                    </span>
                    <span className="font-bold text-white bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                      {powerVal} / 10
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${powerVal * 10}%` }}
                    />
                  </div>
                </div>

                {/* Victory Quote Preview */}
                <div className="pt-1.5 border-t border-slate-800">
                  <p className="text-[10px] text-amber-300/90 italic leading-snug line-clamp-2">
                    "{selectedP1.victoryQuote}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. "CHOOSE YOUR FIGHTER" Section (2 per row grid) */}
          <div className="w-full mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-400 font-arcade text-xs font-bold uppercase tracking-wider">
                1. Choose Your Fighter
              </span>
              <div className="h-px flex-1 bg-amber-500/20" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {fighters.map((f) => {
                const isSelected = f.id === p1Id;
                return (
                  <button
                    key={`p1_${f.id}`}
                    onClick={() => setP1Id(f.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all active:scale-95 min-h-[64px] ${
                      isSelected
                        ? 'bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)] ring-1 ring-amber-400'
                        : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <FighterPortrait fighter={f} renderer={renderer} className="w-11 h-11 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-arcade text-xs font-bold text-white truncate">
                          {f.name.split(' ')[0]}
                        </h3>
                        {isSelected && (
                          <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1 rounded">
                            P1
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 line-clamp-2 leading-tight">
                        {f.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. "CPU OPPONENT" Section (2 per row grid + RANDOM option) */}
          <div className="w-full mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-cyan-400 font-arcade text-xs font-bold uppercase tracking-wider">
                2. CPU Opponent
              </span>
              <div className="h-px flex-1 bg-cyan-500/20" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* RANDOM Challenger Option */}
              <button
                onClick={() => setP2Id('RANDOM')}
                className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all active:scale-95 min-h-[64px] ${
                  p2Id === 'RANDOM'
                    ? 'bg-cyan-500/25 border-2 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400'
                    : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-900 via-purple-900 to-cyan-900 border border-cyan-400/40 flex items-center justify-center text-xl shrink-0 shadow-inner">
                  🎲
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-arcade text-xs font-bold text-cyan-300">RANDOM</h3>
                    {p2Id === 'RANDOM' && (
                      <span className="text-[9px] bg-cyan-400 text-slate-950 font-black px-1 rounded">
                        CPU
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 line-clamp-2 leading-tight">
                    Mystery Rival
                  </p>
                </div>
              </button>

              {/* All Fighters for CPU Selection */}
              {fighters.map((f) => {
                const isSelected = p2Id === f.id;
                return (
                  <button
                    key={`p2_${f.id}`}
                    onClick={() => setP2Id(f.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left transition-all active:scale-95 min-h-[64px] ${
                      isSelected
                        ? 'bg-cyan-500/20 border-2 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.35)] ring-1 ring-cyan-400'
                        : 'bg-slate-900/80 border border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <FighterPortrait fighter={f} renderer={renderer} className="w-11 h-11 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-arcade text-xs font-bold text-white truncate">
                          {f.name.split(' ')[0]}
                        </h3>
                        {isSelected && (
                          <span className="text-[9px] bg-cyan-400 text-slate-950 font-black px-1 rounded">
                            CPU
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 line-clamp-2 leading-tight">
                        {f.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Difficulty Selection (Page ends right after this section) */}
          <div className="w-full">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-400 font-arcade text-xs font-bold uppercase tracking-wider">
                3. Difficulty
              </span>
              <div className="h-px flex-1 bg-yellow-500/20" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['EASY', 'NORMAL', 'HARD'] as AIDifficulty[]).map((d) => {
                const isSelected = difficulty === d;
                return (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`py-2 rounded-xl font-arcade text-xs tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1 ${
                      isSelected
                        ? d === 'EASY'
                          ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-950/50'
                          : d === 'NORMAL'
                          ? 'bg-yellow-400 text-slate-950 font-black shadow-lg shadow-yellow-950/50'
                          : 'bg-rose-500 text-white font-black shadow-lg shadow-rose-950/50'
                        : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{d === 'EASY' ? '🟢' : d === 'NORMAL' ? '🟡' : '🔴'}</span>
                    <span>{d}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Big "FIGHT!" Button OUTSIDE scrolling content (Fixed to bottom, full width, solid dark bar) */}
      <div className="fixed bottom-0 left-0 right-0 w-full bg-[#090d16] border-t border-slate-800 p-3 z-50 flex justify-center shadow-[0_-8px_25px_rgba(0,0,0,0.85)]">
        <button
          onClick={handleFightClick}
          className="w-full max-w-md py-3.5 bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 hover:from-red-500 hover:to-yellow-300 text-slate-950 font-bungee text-2xl tracking-widest rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.6)] active:scale-95 transition-all flex items-center justify-center gap-2 border-2 border-yellow-200"
        >
          <span>🥊</span>
          <span>FIGHT!</span>
          <span>🥊</span>
        </button>
      </div>
    </div>
  );
};
