import React from 'react';
import { GameState } from '../types/game';

interface MatchEndModalProps {
  state: GameState;
  onRematch: () => void;
  onMainMenu: () => void;
}

export const MatchEndModal: React.FC<MatchEndModalProps> = ({
  state,
  onRematch,
  onMainMenu,
}) => {
  if (state.stagePhase !== 'MATCH_END') return null;

  const isPlayerWinner = state.matchWinner === 1;
  const winner = isPlayerWinner ? state.p1 : state.p2;
  const loser = isPlayerWinner ? state.p2 : state.p1;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-slate-900 border-2 border-yellow-500 rounded-3xl max-w-sm sm:max-w-md w-full p-6 shadow-2xl flex flex-col items-center text-center text-slate-100">
        {/* Banner */}
        <div className="text-5xl mb-2 animate-bounce">
          {isPlayerWinner ? '🏆' : '💀'}
        </div>

        <h2 className="font-bungee text-3xl md:text-5xl text-yellow-400 arcade-text-shadow">
          {isPlayerWinner ? 'YOU WIN!' : 'CPU WINS!'}
        </h2>

        <p className="font-arcade text-xs md:text-sm text-slate-300 mt-1 uppercase tracking-wider">
          {winner.config.name} takes the match ({state.p1.roundsWon} - {state.p2.roundsWon})
        </p>

        {/* Winner Quote */}
        <div className="mt-4 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 w-full">
          <p className="text-xs text-amber-300 font-semibold italic">
            "{winner.config.victoryQuote}"
          </p>
          <p className="text-[11px] text-slate-400 mt-1.5">
            {loser.config.name}: "{loser.config.defeatQuote}"
          </p>
        </div>

        {/* Action Buttons: REMATCH and MAIN MENU */}
        <div className="mt-6 w-full space-y-2.5">
          <button
            onClick={onRematch}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bungee text-base md:text-lg tracking-wider rounded-2xl shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-2 border border-yellow-200"
          >
            <span>🥊</span>
            <span>REMATCH</span>
          </button>

          <button
            onClick={onMainMenu}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-arcade text-xs sm:text-sm tracking-wider rounded-xl border border-slate-600 shadow active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <span>🏠</span>
            <span>MAIN MENU</span>
          </button>
        </div>
      </div>
    </div>
  );
};
