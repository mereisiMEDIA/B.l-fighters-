import {
  FighterConfig,
  GameState,
  InputFrame,
} from '../types/game';
import { soundEngine } from './audio';
import {
  AVAILABLE_FIGHTERS,
  createInitialFighterState,
} from './fighters';
import {
  resetInputBuffers,
  resolvePushboxCollision,
  testHitboxCollision,
  updateFighterPhysics,
  updateProjectiles,
} from './physics';

export const TICKS_PER_SECOND = 60;
export const ROUND_TIME_SECONDS = 60;

export function createInitialGameState(
  p1Config: FighterConfig = AVAILABLE_FIGHTERS[0],
  p2Config: FighterConfig = AVAILABLE_FIGHTERS[1]
): GameState {
  const p1 = createInitialFighterState(p1Config, 1, -2.8);
  const p2 = createInitialFighterState(p2Config, 2, 2.8);

  return {
    tick: 0,
    roundTimeRemaining: ROUND_TIME_SECONDS,
    roundTimerTicks: ROUND_TIME_SECONDS * TICKS_PER_SECOND,
    roundNumber: 1,
    matchMaxRounds: 3,
    targetWins: 2, // Best of 3
    roundWinner: null,
    matchWinner: null,
    stagePhase: 'COUNTDOWN',
    announcementText: 'ROUND 1',
    announcementSubtext: 'GET READY!',
    announcementTimer: 90,
    hitStopTicks: 0,
    slowMoFactor: 1.0,
    slowMoTicks: 0,
    screenShake: 0,
    screenShakeDirection: { x: 0, y: 0 },
    p1,
    p2,
    floatingTexts: [],
    particles: [],
    bloodSplats: [],
    stageWidth: 14,
  };
}

export function startNextRound(state: GameState) {
  resetInputBuffers();
  state.roundNumber++;
  state.roundTimeRemaining = ROUND_TIME_SECONDS;
  state.roundTimerTicks = ROUND_TIME_SECONDS * TICKS_PER_SECOND;
  state.roundWinner = null;
  state.hitStopTicks = 0;
  state.slowMoTicks = 0;
  state.slowMoFactor = 1.0;
  state.screenShake = 0;
  state.superCinematicTicks = 0;
  state.superTitleTicks = 0;
  state.superTitle = undefined;
  state.superAttackerIndex = null;
  state.matthewDoorSuper = null;
  state.matthewSleepSuper = null;
  state.floatingTexts = [];
  state.particles = [];
  state.bloodSplats = []; // Everything resets at start of each round

  // Reset positions and health
  state.p1.x = -2.8;
  state.p1.y = 0;
  state.p1.vx = 0;
  state.p1.vy = 0;
  state.p1.facing = 1;
  state.p1.health = state.p1.maxHealth;
  state.p1.displayHealth = state.p1.maxHealth;
  state.p1.actionState = 'IDLE';
  state.p1.currentMove = null;
  state.p1.moveFrame = 0;
  state.p1.hitstunFrames = 0;
  state.p1.blockstunFrames = 0;
  state.p1.isGrounded = true;
  state.p1.isKo = false;
  state.p1.koTumble = 0;
  state.p1.headSquashTimer = 0;
  state.p1.dazedTicks = 0;
  state.p1.pancakeTicks = 0;
  state.p1.comboCount = 0;
  // Super meter carries over between rounds! (preserved exactly as ended)
  state.p1.superMeter = Math.max(0, Math.min(state.p1.maxSuperMeter, state.p1.superMeter));
  state.p1.superMeterHoldTicks = 0;

  state.p2.x = 2.8;
  state.p2.y = 0;
  state.p2.vx = 0;
  state.p2.vy = 0;
  state.p2.facing = -1;
  state.p2.health = state.p2.maxHealth;
  state.p2.displayHealth = state.p2.maxHealth;
  state.p2.actionState = 'IDLE';
  state.p2.currentMove = null;
  state.p2.moveFrame = 0;
  state.p2.hitstunFrames = 0;
  state.p2.blockstunFrames = 0;
  state.p2.isGrounded = true;
  state.p2.isKo = false;
  state.p2.koTumble = 0;
  state.p2.headSquashTimer = 0;
  state.p2.dazedTicks = 0;
  state.p2.pancakeTicks = 0;
  state.p2.comboCount = 0;
  // Super meter carries over between rounds!
  state.p2.superMeter = Math.max(0, Math.min(state.p2.maxSuperMeter, state.p2.superMeter));
  state.p2.superMeterHoldTicks = 0;

  // Reset K.O. sequence state
  state.koSequenceTicks = 0;
  state.koLandedGround = false;
  state.koLoserIndex = null;
  state.koWinnerIndex = null;
  state.whiteFlashTicks = 0;

  state.stagePhase = 'COUNTDOWN';
  const isFinalRound = state.p1.roundsWon === 1 && state.p2.roundsWon === 1;
  state.announcementText = isFinalRound ? 'FINAL ROUND' : `ROUND ${state.roundNumber}`;
  state.announcementSubtext = 'GET READY!';
  state.announcementTimer = 90;
}

export function resetMatch(
  state: GameState,
  p1Config?: FighterConfig,
  p2Config?: FighterConfig
) {
  const newP1 = p1Config || state.p1.config;
  const newP2 = p2Config || state.p2.config;
  const fresh = createInitialGameState(newP1, newP2);
  Object.assign(state, fresh);
}

/**
 * Main game simulation tick (runs 60 times per second)
 */
export function tickGameState(
  state: GameState,
  p1Input: InputFrame,
  p2Input: InputFrame
) {
  state.tick++;

  // Screen shake decay
  if (state.screenShake > 0.05) {
    state.screenShake *= 0.86;
    state.screenShakeDirection = {
      x: (Math.random() - 0.5) * state.screenShake * 0.08,
      y: (Math.random() - 0.5) * state.screenShake * 0.08,
    };
  } else {
    state.screenShake = 0;
    state.screenShakeDirection = { x: 0, y: 0 };
  }

  // Hit-stop frames (freeze characters on hard impact for punchiness)
  if (state.hitStopTicks > 0) {
    state.hitStopTicks--;
    // Still update floating texts and particles during hitstop
    updateVisualEffects(state);
    return;
  }

  // Slow-motion decay for dramatic K.O. or Super Move
  if (state.slowMoTicks > 0) {
    state.slowMoTicks--;
    if (state.slowMoTicks === 0) {
      state.slowMoFactor = 1.0;
    }
  }

  // Super cinematic countdown
  if (state.superCinematicTicks && state.superCinematicTicks > 0) {
    state.superCinematicTicks--;
    if (state.superCinematicTicks === 0) {
      state.superAttackerIndex = null;
    }
  }
  if (state.superTitleTicks && state.superTitleTicks > 0) {
    state.superTitleTicks--;
    if (state.superTitleTicks === 0) {
      state.superTitle = undefined;
    }
  }

  // Handle stage phases
  switch (state.stagePhase) {
    case 'COUNTDOWN': {
      state.announcementTimer--;
      if (state.announcementTimer === 35) {
        state.announcementText = 'FIGHT!';
        state.announcementSubtext = '';
        soundEngine.playRoundStart();
      } else if (state.announcementTimer <= 0) {
        state.stagePhase = 'FIGHTING';
        state.announcementText = '';
      }
      break;
    }

    case 'FIGHTING': {
      // Countdown timer
      state.roundTimerTicks--;
      state.roundTimeRemaining = Math.max(0, Math.ceil(state.roundTimerTicks / TICKS_PER_SECOND));

      // Update character physics & actions
      updateFighterPhysics(state.p1, state.p2, p1Input, state);
      updateFighterPhysics(state.p2, state.p1, p2Input, state);
      resolvePushboxCollision(state.p1, state.p2);

      // Hitbox vs Hurtbox collisions
      testHitboxCollision(state.p1, state.p2, state);
      testHitboxCollision(state.p2, state.p1, state);

      // Projectiles (e.g. duct tape roll)
      updateProjectiles(state);

      // Check KO condition
      if (state.p1.health <= 0 || state.p2.health <= 0 || state.roundTimerTicks <= 0) {
        handleRoundFinish(state);
      }
      break;
    }

    case 'ROUND_END': {
      // Let physics continue slightly (for ragdoll falling and KO animations)
      updateFighterPhysics(state.p1, state.p2, { ...p1Input, left: false, right: false, up: false, down: false, lightPunch: false, heavyPunch: false, lightKick: false, heavyKick: false, superMove: false, block: false, dashForward: false, dashBack: false }, state);
      updateFighterPhysics(state.p2, state.p1, { ...p2Input, left: false, right: false, up: false, down: false, lightPunch: false, heavyPunch: false, lightKick: false, heavyKick: false, superMove: false, block: false, dashForward: false, dashBack: false }, state);
      resolvePushboxCollision(state.p1, state.p2);

      // KO sequence timeline management (max 4.0s = 240 ticks)
      if (state.koSequenceTicks && state.koSequenceTicks > 0) {
        state.koSequenceTicks--;

        // After ~1.1s (when loser hits canvas mat), "K.O.!" text pops up and winner poses
        if (state.koSequenceTicks === 175 || (!state.koLandedGround && state.koSequenceTicks < 175)) {
          state.koLandedGround = true;
          state.announcementText = state.roundWinner === 'DRAW' ? 'DOUBLE K.O.!' : 'K.O.!';
          if (state.roundWinner === 1) {
            state.announcementSubtext = `${state.p1.config.name} WINS THE ROUND!`;
            state.p1.actionState = 'VICTORY';
          } else if (state.roundWinner === 2) {
            state.announcementSubtext = `${state.p2.config.name} WINS THE ROUND!`;
            state.p2.actionState = 'VICTORY';
          }
          soundEngine.playKoAnnounce();
        }

        if (state.koSequenceTicks === 0) {
          // Check match winner
          if (state.p1.roundsWon >= state.targetWins) {
            state.matchWinner = 1;
            state.stagePhase = 'MATCH_END';
            state.announcementText = 'VICTORY!';
            state.announcementSubtext = `${state.p1.config.name} IS THE CHAMPION!`;
            soundEngine.playVictoryFanfare();
          } else if (state.p2.roundsWon >= state.targetWins) {
            state.matchWinner = 2;
            state.stagePhase = 'MATCH_END';
            state.announcementText = 'DEFEATED!';
            state.announcementSubtext = `${state.p2.config.name} CLAIMS THE BELT!`;
          } else {
            startNextRound(state);
          }
        }
      } else {
        state.announcementTimer--;
        if (state.announcementTimer <= 0) {
          startNextRound(state);
        }
      }
      break;
    }

    case 'MATCH_END': {
      // Victory animations
      if (state.matchWinner === 1) {
        state.p1.actionState = 'VICTORY';
        state.p2.actionState = 'DEFEAT';
      } else if (state.matchWinner === 2) {
        state.p2.actionState = 'VICTORY';
        state.p1.actionState = 'DEFEAT';
      }
      break;
    }

    default:
      break;
  }

  // White flash overlay decay on impact
  if (state.whiteFlashTicks && state.whiteFlashTicks > 0) {
    state.whiteFlashTicks--;
  }

  // Update floating popups and particles
  updateVisualEffects(state);
}

function handleRoundFinish(state: GameState) {
  // Clear any active super cinematic states
  state.matthewDoorSuper = null;
  state.matthewSleepSuper = null;

  const isKo = state.p1.health <= 0 || state.p2.health <= 0;

  if (isKo) {
    // 1. Slow motion (0.3x speed) for ~1 sec
    state.slowMoTicks = 60;
    state.slowMoFactor = 0.30;
    // 2. White flash on impact & strong screen shake
    state.whiteFlashTicks = 14;
    state.screenShake = 24;
    // 3. KO sequence (max 4.0s = 240 ticks)
    state.koSequenceTicks = 240;
    state.koLandedGround = false;

    // Announcement text hidden until loser hits the ground
    state.announcementText = '';
    state.announcementSubtext = '';

    let winner: 1 | 2 | 'DRAW' = 'DRAW';
    if (state.p1.health <= 0 && state.p2.health <= 0) {
      winner = 'DRAW';
      state.p1.isKo = true;
      state.p2.isKo = true;
      state.koLoserIndex = null;
      state.koWinnerIndex = null;
    } else if (state.p1.health <= 0) {
      winner = 2;
      state.p2.roundsWon++;
      state.p1.isKo = true;
      state.koLoserIndex = 1;
      state.koWinnerIndex = 2;
    } else if (state.p2.health <= 0) {
      winner = 1;
      state.p1.roundsWon++;
      state.p2.isKo = true;
      state.koLoserIndex = 2;
      state.koWinnerIndex = 1;
    }

    state.roundWinner = winner;
    state.stagePhase = 'ROUND_END';
    state.announcementTimer = 240;
  } else {
    // Time out finish
    let winner: 1 | 2 | 'DRAW' = 'DRAW';
    if (state.p1.health > state.p2.health) {
      winner = 1;
      state.p1.roundsWon++;
      state.announcementText = 'TIME UP!';
      state.announcementSubtext = `${state.p1.config.name} WINS BY HEALTH!`;
    } else if (state.p2.health > state.p1.health) {
      winner = 2;
      state.p2.roundsWon++;
      state.announcementText = 'TIME UP!';
      state.announcementSubtext = `${state.p2.config.name} WINS BY HEALTH!`;
    } else {
      winner = 'DRAW';
      state.announcementText = 'DRAW GAME!';
    }

    state.roundWinner = winner;
    if (state.p1.roundsWon >= state.targetWins) {
      state.matchWinner = 1;
      state.stagePhase = 'MATCH_END';
      state.announcementText = 'VICTORY!';
      state.announcementSubtext = `${state.p1.config.name} IS THE CHAMPION!`;
      soundEngine.playVictoryFanfare();
    } else if (state.p2.roundsWon >= state.targetWins) {
      state.matchWinner = 2;
      state.stagePhase = 'MATCH_END';
      state.announcementText = 'DEFEATED!';
      state.announcementSubtext = `${state.p2.config.name} CLAIMS THE BELT!`;
    } else {
      state.stagePhase = 'ROUND_END';
      state.announcementTimer = 150;
    }
  }
}

function updateVisualEffects(state: GameState) {
  // Update floating popups
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const txt = state.floatingTexts[i];
    txt.life--;
    txt.x += txt.vx;
    txt.y += txt.vy;
    txt.vy *= 0.94;
    txt.scale = Math.max(0.6, txt.scale * 0.98);

    if (txt.life <= 0) {
      state.floatingTexts.splice(i, 1);
    }
  }

  // Update particles with gravity and specialized particle behaviors
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life--;
    p.x += p.vx;
    p.y += p.vy;
    p.z += p.vz;

    if (p.shape === 'blood') {
      p.vy -= 0.007; // Cartoon gravity on red droplets
      // When droplet hits the mat (Y <= 0.04), it leaves a red splat on the mat!
      if (p.y <= 0.04 && p.vy < 0) {
        if (!state.bloodSplats) state.bloodSplats = [];
        if (state.bloodSplats.length < 50) {
          state.bloodSplats.push({
            x: p.x,
            z: p.z || (Math.random() - 0.5) * 0.8,
            scale: p.size * (1.7 + Math.random() * 0.8),
            rotation: Math.random() * Math.PI * 2,
            life: 600, // 10 seconds at 60 fps
            maxLife: 600,
          });
        }
        state.particles.splice(i, 1);
        continue;
      }
    } else if (p.shape === 'tooth') {
      p.vy -= 0.006;
      if (p.y <= 0.03 && p.vy < 0) {
        p.y = 0.03;
        p.vy = -p.vy * 0.35; // bounce slightly
        p.vx *= 0.7; // friction on mat
      }
    } else if (p.shape === 'sweat') {
      p.vy -= 0.004;
    } else if (p.shape === 'tear') {
      p.vy -= 0.005;
    } else if (p.shape === 'breath') {
      p.vy += 0.001; // gently float upward
      p.vx *= 0.96;
      p.size *= 1.02;
    } else {
      p.vy -= 0.003; // default gravity on hit sparks
    }

    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }

  // Update mat blood splats (fade after 10 sec)
  if (state.bloodSplats) {
    for (let i = state.bloodSplats.length - 1; i >= 0; i--) {
      const splat = state.bloodSplats[i];
      splat.life--;
      if (splat.life <= 0) {
        state.bloodSplats.splice(i, 1);
      }
    }
  }

  // On KO: big cartoon tears spraying sideways like fountains!
  if (state.p1.isKo && state.tick % 4 === 0) {
    state.particles.push(
      {
        x: state.p1.x - 0.12,
        y: state.p1.y + 1.68,
        z: 0.1,
        vx: -0.14 - Math.random() * 0.06,
        vy: 0.16 + Math.random() * 0.06,
        vz: (Math.random() - 0.5) * 0.04,
        color: 0x38bdf8,
        size: 0.32,
        life: 45,
        maxLife: 45,
        shape: 'tear',
      },
      {
        x: state.p1.x + 0.12,
        y: state.p1.y + 1.68,
        z: 0.1,
        vx: 0.14 + Math.random() * 0.06,
        vy: 0.16 + Math.random() * 0.06,
        vz: (Math.random() - 0.5) * 0.04,
        color: 0x38bdf8,
        size: 0.32,
        life: 45,
        maxLife: 45,
        shape: 'tear',
      }
    );
  }
  if (state.p2.isKo && state.tick % 4 === 0) {
    state.particles.push(
      {
        x: state.p2.x - 0.12,
        y: state.p2.y + 1.68,
        z: 0.1,
        vx: -0.14 - Math.random() * 0.06,
        vy: 0.16 + Math.random() * 0.06,
        vz: (Math.random() - 0.5) * 0.04,
        color: 0x38bdf8,
        size: 0.32,
        life: 45,
        maxLife: 45,
        shape: 'tear',
      },
      {
        x: state.p2.x + 0.12,
        y: state.p2.y + 1.68,
        z: 0.1,
        vx: 0.14 + Math.random() * 0.06,
        vy: 0.16 + Math.random() * 0.06,
        vz: (Math.random() - 0.5) * 0.04,
        color: 0x38bdf8,
        size: 0.32,
        life: 45,
        maxLife: 45,
        shape: 'tear',
      }
    );
  }

  // Cap particles to max 150
  if (state.particles.length > 150) {
    state.particles = state.particles.slice(-150);
  }
}
