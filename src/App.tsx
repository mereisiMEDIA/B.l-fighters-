/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameState, FighterConfig } from './types/game';
import { AVAILABLE_FIGHTERS } from './game/fighters';
import { AIInput, AIDifficulty, KeyboardInput } from './game/input/InputSource';
import { createInitialGameState, resetMatch, tickGameState } from './game/engine';
import { GameRenderer } from './game/renderer';
import { soundEngine } from './game/audio';
import { HUD } from './components/HUD';
import { TouchControls } from './components/TouchControls';
import { MoveListModal } from './components/MoveListModal';
import { MatchEndModal } from './components/MatchEndModal';
import { StartScreen } from './components/StartScreen';

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);

  // Core Game State reference for fixed 60Hz loop
  const gameStateRef = useRef<GameState>(createInitialGameState());

  // Input sources
  const keyboardInputRef = useRef<KeyboardInput | null>(null);
  const aiInputRef = useRef<AIInput | null>(null);

  // Start Screen state (shown before any fight when game opens)
  const [isInStartScreen, setIsInStartScreen] = useState(true);
  const isInStartScreenRef = useRef(true);
  const [isRendererReady, setIsRendererReady] = useState(false);

  // React state for HUD updates
  const [hudState, setHudState] = useState<GameState>(gameStateRef.current);
  const [isMoveListOpen, setIsMoveListOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showTouchControls, setShowTouchControls] = useState(true);
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('NORMAL');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [showRotateHint, setShowRotateHint] = useState(false);
  const hasShownRotateHintRef = useRef(false);

  useEffect(() => {
    isInStartScreenRef.current = isInStartScreen;
  }, [isInStartScreen]);

  // Orientation & Fullscreen listeners
  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);

      // Show rotate hint once per session only, auto-hide after 3s
      if (portrait && !hasShownRotateHintRef.current) {
        try {
          const alreadySeen = sessionStorage.getItem('rotate_hint_seen');
          if (!alreadySeen) {
            sessionStorage.setItem('rotate_hint_seen', 'true');
            hasShownRotateHintRef.current = true;
            setShowRotateHint(true);
            setTimeout(() => {
              setShowRotateHint(false);
            }, 3000);
          } else {
            hasShownRotateHintRef.current = true;
          }
        } catch {
          hasShownRotateHintRef.current = true;
          setShowRotateHint(true);
          setTimeout(() => {
            setShowRotateHint(false);
          }, 3000);
        }
      }

      if (rendererRef.current) {
        rendererRef.current.onResize();
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Initialize Game, Renderer, and Fixed 60Hz Loop
  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize 3D Three.js Renderer
    const renderer = new GameRenderer(containerRef.current);
    rendererRef.current = renderer;
    setIsRendererReady(true);

    // 2. Initialize Inputs
    const keyInput = new KeyboardInput();
    const aiInput = new AIInput(aiDifficulty);
    keyboardInputRef.current = keyInput;
    aiInputRef.current = aiInput;

    // 3. Fixed Timestep Loop (60 ticks/second)
    let animationFrameId: number;
    let lastTime = performance.now();
    let accumulator = 0;
    const TICK_DURATION = 1000 / 60; // 16.666ms

    const loop = (currentTime: number) => {
      let delta = currentTime - lastTime;
      lastTime = currentTime;

      // Cap delta to prevent spiral of death on tab switch
      if (delta > 250) delta = 250;

      // Apply slow motion factor if active (e.g. dramatic K.O.)
      const slowMo = gameStateRef.current.slowMoFactor || 1.0;
      delta *= slowMo;
      accumulator += delta;

      // Consume fixed ticks only when fight is active (not on start screen)
      if (!isInStartScreenRef.current) {
        while (accumulator >= TICK_DURATION) {
          const state = gameStateRef.current;
          const p1Input = keyInput.poll(state, 1);
          const p2Input = aiInput.poll(state, 2);

          tickGameState(state, p1Input, p2Input);
          accumulator -= TICK_DURATION;
        }
      } else {
        // Clear accumulator while on start screen so time doesn't burst upon start
        accumulator = 0;
      }

      // Render 3D scene
      if (rendererRef.current) {
        rendererRef.current.render(gameStateRef.current);
      }

      // Sync React HUD state
      setHudState({ ...gameStateRef.current });

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      keyInput.destroy();
      renderer.destroy();
    };
  }, []);

  // Update AI difficulty
  const handleChangeDifficulty = (newDiff: AIDifficulty) => {
    setAiDifficulty(newDiff);
    if (aiInputRef.current) {
      aiInputRef.current.difficulty = newDiff;
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  };

  // Fullscreen Toggle
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Reset / Rematch (with same fighters)
  const handleRematch = () => {
    resetMatch(gameStateRef.current);
    if (aiInputRef.current) aiInputRef.current.reset();
    if (keyboardInputRef.current) keyboardInputRef.current.reset();
  };

  // Start Fight from Start Screen
  const handleStartFight = (
    p1Fighter: FighterConfig,
    p2Fighter: FighterConfig,
    difficulty: AIDifficulty
  ) => {
    handleChangeDifficulty(difficulty);
    resetMatch(gameStateRef.current, p1Fighter, p2Fighter);
    if (aiInputRef.current) aiInputRef.current.reset();
    if (keyboardInputRef.current) keyboardInputRef.current.reset();
    isInStartScreenRef.current = false;
    setIsInStartScreen(false);
  };

  // Return to Main Menu / Start Screen (resets match for new game)
  const handleOpenMainMenu = () => {
    resetMatch(gameStateRef.current);
    if (aiInputRef.current) aiInputRef.current.reset();
    if (keyboardInputRef.current) keyboardInputRef.current.reset();
    isInStartScreenRef.current = true;
    setIsInStartScreen(true);
  };

  const handleTestFx = () => {
    const s = gameStateRef.current;
    if (!s) return;

    // Center screen coordinates (X=0, Y=1.4)
    const centerX = 0;
    const centerY = 1.4;

    // Trigger visual effects system test in effects.js
    if (rendererRef.current?.effects) {
      rendererRef.current.effects.triggerTestFx(centerX, centerY, s, s.p1, s.p2);
    }

    // 1. Cartoon red droplets (#FF1A1A) with gravity bursting from center
    for (let i = 0; i < 15; i++) {
      s.particles.push({
        x: centerX + (Math.random() - 0.5) * 0.2,
        y: centerY + (Math.random() - 0.5) * 0.2,
        z: 0.1,
        vx: (Math.random() - 0.5) * 0.16,
        vy: 0.08 + Math.random() * 0.14,
        vz: (Math.random() - 0.5) * 0.1,
        color: 0xff1a1a,
        size: 0.34,
        life: 70,
        maxLife: 70,
        shape: 'blood',
      });
    }

    // 2. Mat blood splat stains on the mat right in center
    if (!s.bloodSplats) s.bloodSplats = [];
    s.bloodSplats.push(
      {
        x: centerX - 0.35,
        z: 0.1,
        scale: 0.42,
        rotation: Math.random() * Math.PI * 2,
        life: 600,
        maxLife: 600,
      },
      {
        x: centerX + 0.35,
        z: -0.1,
        scale: 0.38,
        rotation: Math.random() * Math.PI * 2,
        life: 600,
        maxLife: 600,
      }
    );

    // 3. White flying tooth flying out with high arc
    s.particles.push({
      x: centerX,
      y: centerY,
      z: 0.15,
      vx: 0.08,
      vy: 0.20,
      vz: 0.02,
      color: 0xffffff,
      size: 0.38,
      life: 75,
      maxLife: 75,
      shape: 'tooth',
    });

    // 4. Bright light-blue sweat drops
    for (let i = 0; i < 8; i++) {
      s.particles.push({
        x: centerX + (Math.random() - 0.5) * 0.3,
        y: centerY + 0.3,
        z: 0.1,
        vx: (Math.random() - 0.5) * 0.12,
        vy: 0.06 + Math.random() * 0.10,
        vz: (Math.random() - 0.5) * 0.06,
        color: 0x38bdf8,
        size: 0.24,
        life: 35,
        maxLife: 35,
        shape: 'sweat',
      });
    }

    // 5. Cartoon blue tears spraying sideways
    for (let i = 0; i < 6; i++) {
      s.particles.push({
        x: centerX + (Math.random() - 0.5) * 0.2,
        y: centerY + 0.2,
        z: 0.1,
        vx: (i % 2 === 0 ? -1 : 1) * (0.13 + Math.random() * 0.05),
        vy: 0.14 + Math.random() * 0.06,
        vz: (Math.random() - 0.5) * 0.04,
        color: 0x60a5fa,
        size: 0.30,
        life: 45,
        maxLife: 45,
        shape: 'tear',
      });
    }

    // 6. Mouth breath puff
    s.particles.push({
      x: centerX,
      y: centerY + 0.1,
      z: 0.1,
      vx: 0.02,
      vy: 0.015,
      vz: 0,
      color: 0xe2e8f0,
      size: 0.32,
      life: 38,
      maxLife: 38,
      shape: 'breath',
    });

    // 7. Face squash & dazed stars
    s.p1.headSquashTimer = 16;
    s.p1.dazedTicks = 180;
    s.p2.headSquashTimer = 16;
    s.p2.dazedTicks = 180;

    // Set health to 20% to activate bruise, black eye, nose bleed, and cut
    s.p1.health = Math.round(s.p1.maxHealth * 0.20);
    s.p2.health = Math.round(s.p2.maxHealth * 0.20);

    // 8. Comic pop-up text
    s.floatingTexts.push({
      id: `test_${Date.now()}`,
      text: '💥 TEST FX! 💥',
      x: centerX,
      y: centerY + 0.9,
      color: '#ef4444',
      scale: 1.3,
      life: 50,
      maxLife: 50,
      vx: 0,
      vy: 0.03,
      rotation: 0,
    });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none touch-none">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none" />

      {/* Atmospheric Vignette overlay to focus on the ring and fighters */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(4,6,14,0.78)_100%)] shadow-[inset_0_0_100px_rgba(4,6,14,0.9)] z-5" />

      {/* Floating Header Secondary Controls (TEST FX, Pad toggle, Reset, Menu) */}
      {!isInStartScreen && (
        <div className="absolute top-1.5 right-2 md:top-3 md:right-4 z-30 flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={handleTestFx}
            title="Test Visual Effects (droplets, splats, tooth, sweat, tears, face damage, stars)"
            className="bg-red-950/80 hover:bg-red-900/90 text-red-200 px-2 py-0.5 rounded text-[10px] md:text-xs font-arcade border border-red-500/50 shadow flex items-center gap-1 active:scale-95 transition"
          >
            <span>💥</span>
            <span>TEST FX</span>
          </button>

          <button
            onClick={() => {
              if (gameStateRef.current && gameStateRef.current.p1) {
                gameStateRef.current.p1.superMeter = 300;
              }
            }}
            title="Fill P1 Super Meter to 3 Levels Instantly"
            className="bg-amber-950/80 hover:bg-amber-900/90 text-amber-200 px-2 py-0.5 rounded text-[10px] md:text-xs font-arcade border border-amber-500/50 shadow flex items-center gap-1 active:scale-95 transition"
          >
            <span>⚡</span>
            <span>FULL METER</span>
          </button>

          <button
            onClick={() => setShowTouchControls(!showTouchControls)}
            title="Toggle On-Screen Touch Controls"
            className="bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 px-2 py-0.5 rounded text-[10px] md:text-xs font-arcade border border-white/10 shadow flex items-center gap-1 active:scale-95 transition"
          >
            <span>📱</span>
            <span className="hidden sm:inline">{showTouchControls ? 'Hide Pad' : 'Show Pad'}</span>
          </button>

          <button
            onClick={handleRematch}
            title="Restart Round / Match"
            className="bg-slate-900/60 hover:bg-slate-800/80 text-yellow-300 px-2 py-0.5 rounded text-[10px] md:text-xs font-arcade border border-white/10 shadow flex items-center gap-1 active:scale-95 transition"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={handleOpenMainMenu}
            title="Return to Main Menu / Fighter Select"
            className="bg-slate-900/60 hover:bg-slate-800/80 text-amber-300 px-2 py-0.5 rounded text-[10px] md:text-xs font-arcade border border-white/10 shadow flex items-center gap-1 active:scale-95 transition"
          >
            <span>🏠</span>
            <span className="hidden sm:inline">Menu</span>
          </button>
        </div>
      )}

      {/* Portrait Mode Hint: Small hint above controls, shows once per session, auto-hides after 3s, never covers HUD */}
      {!isInStartScreen && isPortrait && showRotateHint && (
        <div className="absolute bottom-36 sm:bottom-40 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-500 animate-fadeIn">
          <div className="bg-slate-900/90 backdrop-blur-sm text-amber-300 border border-amber-400/40 px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 font-arcade text-[10px] sm:text-xs">
            <span className="text-xs">🔄</span>
            <span>Rotate phone for widescreen view</span>
          </div>
        </div>
      )}

      {/* Arcade HUD Overlay (Active during gameplay) */}
      {!isInStartScreen && (
        <HUD
          state={hudState}
          isPortrait={isPortrait}
          onOpenMoveList={() => setIsMoveListOpen(true)}
          onResetMatch={handleRematch}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
        />
      )}

      {/* Semi-transparent Virtual Touch Controls with press-and-hold */}
      {!isInStartScreen && showTouchControls && (
        <TouchControls superMeter={hudState.p1.superMeter} />
      )}

      {/* Moves & Guide Modal */}
      <MoveListModal isOpen={isMoveListOpen} onClose={() => setIsMoveListOpen(false)} />

      {/* Match Victory / Defeat Modal (Rematch + Main Menu buttons) */}
      <MatchEndModal
        state={hudState}
        onRematch={handleRematch}
        onMainMenu={handleOpenMainMenu}
      />

      {/* START SCREEN (Shown when the game opens, before any fight) */}
      {isInStartScreen && (
        <StartScreen
          renderer={isRendererReady ? rendererRef.current : null}
          initialDifficulty={aiDifficulty}
          onStartFight={handleStartFight}
        />
      )}
    </div>
  );
}
