import React, { useEffect, useState } from 'react';
import { FighterConfig } from '../types/game';
import { GameRenderer } from '../game/renderer';
import { getCachedPortrait, renderFighterPortrait } from '../utils/portraitRenderer';

interface FighterPortraitProps {
  fighter: FighterConfig;
  renderer?: GameRenderer | null;
  className?: string;
}

export const FighterPortrait: React.FC<FighterPortraitProps> = ({
  fighter,
  renderer,
  className = '',
}) => {
  const [portraitUrl, setPortraitUrl] = useState<string | null>(() => {
    return getCachedPortrait(fighter.id) || null;
  });

  useEffect(() => {
    // Check if already cached
    const cached = getCachedPortrait(fighter.id);
    if (cached) {
      setPortraitUrl(cached);
      return;
    }

    // Render once from 3D model when renderer is available
    if (renderer) {
      try {
        const url = renderFighterPortrait(fighter, renderer);
        setPortraitUrl(url);
      } catch (err) {
        console.error('Failed to render fighter 3D portrait:', err);
      }
    }
  }, [fighter, renderer]);

  return (
    <div
      className={`relative rounded-xl overflow-hidden flex items-center justify-center bg-slate-900 border border-slate-700/60 shadow-inner select-none ${className}`}
    >
      {portraitUrl ? (
        <img
          src={portraitUrl}
          alt={fighter.name}
          className="w-full h-full object-cover scale-105 transition-transform"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-slate-800 animate-pulse">
          <span className="text-[10px] font-arcade text-slate-400">...</span>
        </div>
      )}
    </div>
  );
};
