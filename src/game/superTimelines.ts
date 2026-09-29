import { GameState, FighterState } from '../types/game';
import { soundEngine } from './audio';
import { spawnFloatingText, spawnParticles } from './physics';

export interface SuperTimelineStep {
  startTime: number; // in seconds
  action: (state: GameState, attacker: FighterState, opponent: FighterState) => void;
  update?: (state: GameState, attacker: FighterState, opponent: FighterState, elapsedSec: number) => void;
}

export interface SuperTimeline {
  id: 'door_to_door' | 'sleeping_giant';
  name: string;
  totalDuration: number; // in seconds
  meterCost: number;
  steps: SuperTimelineStep[];
}

/**
 * LEVEL 2 "DOOR-TO-DOOR SALES" (total 4 sec):
 * - 0.0: show title, lock the opponent in place.
 * - 0.3: spawn a wooden door behind the opponent. Pop-up "KNOCK KNOCK!". Matthew punches, opponent flies through, door breaks into pieces.
 * - 1.3: same with a gray steel door.
 * - 2.3: an armored security door falls flat on the opponent, squashing them. Pop-up "LIFETIME WARRANTY!". Apply 35% damage.
 * - 3.5: remove all doors, unlock the opponent, back to normal.
 */
export const MATTHEW_LVL2_TIMELINE: SuperTimeline = {
  id: 'door_to_door',
  name: 'DOOR-TO-DOOR SALES',
  totalDuration: 4.0,
  meterCost: 200,
  steps: [
    // 0.0: show title, lock the opponent in place.
    {
      startTime: 0.0,
      action: (state, attacker, opponent) => {
        state.superTitle = 'DOOR-TO-DOOR SALES';
        state.superTitleTicks = 70;
        state.superCinematicTicks = 60;
        state.superAttackerIndex = attacker.playerIndex;
        state.superType = 'standard';

        soundEngine.playSuperHit();

        // Lock opponent in place
        opponent.actionState = 'HITSTUN';
        opponent.hitstunFrames = 240;
        opponent.vx = 0;
        opponent.vy = 0;
        opponent.isGrounded = true;
        opponent.y = 0;
        attacker.vx = 0;
        attacker.vy = 0;
        attacker.isGrounded = true;
        attacker.y = 0;

        // Position fighters within visible stage limits
        const stageLimit = (state.stageWidth / 2) - 1.5;
        let oppX = opponent.x;
        if (attacker.facing === 1) {
          oppX = Math.max(-stageLimit + 1.2, Math.min(stageLimit - 3.6, oppX));
        } else {
          oppX = Math.min(stageLimit - 1.2, Math.max(-stageLimit + 3.6, oppX));
        }
        opponent.x = oppX;
        attacker.x = oppX - 1.25 * attacker.facing;

        const d1X = oppX + 1.1 * attacker.facing;
        const d2X = oppX + 2.2 * attacker.facing;
        const d3X = oppX + 3.3 * attacker.facing;

        state.matthewDoorSuper = {
          attackerIndex: attacker.playerIndex,
          defenderIndex: opponent.playerIndex,
          tick: 0,
          elapsedSec: 0,
          phase: 'KNOCK_1',
          hitConnected: true,
          damageApplied: false,
          door1Visible: false,
          door2Visible: false,
          door3Visible: false,
          door1Broken: false,
          door2Broken: false,
          door3Fallen: false,
          receiptGiven: false,
          door1X: d1X,
          door2X: d2X,
          door3X: d3X,
        };
      },
    },

    // 0.3: spawn a wooden door behind the opponent. Pop-up "KNOCK KNOCK!". Matthew punches, opponent flies through, door breaks into pieces.
    {
      startTime: 0.3,
      action: (state, attacker, opponent) => {
        const ds = state.matthewDoorSuper;
        if (!ds) return;
        ds.door1Visible = true;
        ds.door1Broken = false;
        ds.phase = 'SLAM_1';

        spawnFloatingText(state, 'KNOCK KNOCK! 🚪', ds.door1X, 2.0, '#f59e0b');
        soundEngine.playWhoosh(1.4);

        // Matthew punches, opponent flies through, door breaks into pieces
        ds.door1Broken = true;
        opponent.x = ds.door1X + 0.45 * attacker.facing;
        attacker.x = ds.door1X - 0.45 * attacker.facing;

        soundEngine.playHeavyHit();
        state.screenShake = 16;
        spawnParticles(state, ds.door1X, 1.2, 0, 25, 0x854d0e, 'spark');
      },
    },

    // 1.3: same with a gray steel door.
    {
      startTime: 1.3,
      action: (state, attacker, opponent) => {
        const ds = state.matthewDoorSuper;
        if (!ds) return;
        ds.door2Visible = true;
        ds.door2Broken = false;
        ds.phase = 'SLAM_2';

        spawnFloatingText(state, 'KNOCK KNOCK! 🚪', ds.door2X, 2.0, '#94a3b8');
        soundEngine.playWhoosh(1.2);

        ds.door2Broken = true;
        opponent.x = ds.door2X + 0.45 * attacker.facing;
        attacker.x = ds.door2X - 0.45 * attacker.facing;

        soundEngine.playHeavyHit();
        state.screenShake = 18;
        spawnParticles(state, ds.door2X, 1.2, 0, 25, 0x64748b, 'spark');
        spawnParticles(state, ds.door2X, 1.2, 0, 15, 0x94a3b8, 'spark');
      },
    },

    // 2.3: an armored security door falls flat on the opponent, squashing them. Pop-up "LIFETIME WARRANTY!". Apply 35% damage.
    {
      startTime: 2.3,
      action: (state, attacker, opponent) => {
        const ds = state.matthewDoorSuper;
        if (!ds) return;
        ds.door3Visible = true;
        ds.door3X = opponent.x;
        attacker.x = ds.door3X - 1.35 * attacker.facing;
        ds.door3Fallen = true;
        ds.phase = 'SQUASH_3';

        opponent.pancakeTicks = 72;

        spawnFloatingText(state, 'LIFETIME WARRANTY! 🛡️', ds.door3X, 2.2, '#facc15');

        if (!ds.damageApplied) {
          ds.damageApplied = true;
          const dmg = Math.round(opponent.maxHealth * 0.35);
          opponent.health = Math.max(0, opponent.health - dmg);
          soundEngine.playSuperHit();
          state.screenShake = 24;
          state.hitStopTicks = 12;
          spawnParticles(state, ds.door3X, 0.3, 0, 30, 0xfacc15, 'spark');
        }
      },
    },

    // 3.5: remove all doors, unlock the opponent, back to normal.
    {
      startTime: 3.5,
      action: (state, attacker, opponent) => {
        state.matthewDoorSuper = null;

        opponent.actionState = 'IDLE';
        opponent.hitstunFrames = 0;
        opponent.pancakeTicks = 0;
        opponent.vx = 0;
        opponent.vy = 0;

        attacker.actionState = 'IDLE';
        attacker.currentMove = null;
        attacker.moveFrame = 0;
        attacker.vx = 0;
        attacker.vy = 0;
      },
    },
  ],
};

/**
 * LEVEL 3 "THE SLEEPING GIANT" (total 5 sec):
 * - 0.0: show title, lock the opponent. Matthew yawns, "Zzz" bubbles.
 * - 0.8: a giant shawarma (cylinder wrapped in a tan pita) floats above the ring.
 * - 1.5: Matthew scales up smoothly to 3x and rises into the air toward the shawarma.
 * - 3.0: he drops down fast onto the opponent: big impact, strong screen shake, shockwave ring, a dark crater decal on the floor. Apply 45% damage.
 * - 3.8: Matthew scales back to normal size, pop-up "Did the evening start yet?".
 * - 4.5: remove the shawarma and crater, unlock the opponent, back to normal.
 */
export const MATTHEW_LVL3_TIMELINE: SuperTimeline = {
  id: 'sleeping_giant',
  name: 'THE SLEEPING GIANT (ULTIMATE)',
  totalDuration: 5.0,
  meterCost: 300,
  steps: [
    // 0.0: show title, lock the opponent. Matthew yawns, "Zzz" bubbles.
    {
      startTime: 0.0,
      action: (state, attacker, opponent) => {
        state.superTitle = 'THE SLEEPING GIANT';
        state.superTitleTicks = 70;
        state.superCinematicTicks = 60;
        state.superAttackerIndex = attacker.playerIndex;
        state.superType = 'ultimate';

        soundEngine.playSuperHit();

        // Lock the opponent
        opponent.actionState = 'HITSTUN';
        opponent.hitstunFrames = 300;
        opponent.vx = 0;
        opponent.vy = 0;
        opponent.isGrounded = true;
        opponent.y = 0;
        attacker.vx = 0;
        attacker.vy = 0;
        attacker.isGrounded = true;
        attacker.y = 0;

        state.matthewSleepSuper = {
          attackerIndex: attacker.playerIndex,
          defenderIndex: opponent.playerIndex,
          tick: 0,
          elapsedSec: 0,
          phase: 'YAWN_SLEEP',
          hitConnected: true,
          damageApplied: false,
          matthewScale: 1.0,
          matthewY: 0,
          craterVisible: false,
          craterX: opponent.x,
          shawarmaVisible: false,
          shawarmaY: 3.6,
          crowdAsleep: true,
        };

        spawnFloatingText(state, 'Zzz...', attacker.x, attacker.y + 2.0, '#c084fc');
        soundEngine.playWhoosh(1.2);
        spawnParticles(state, attacker.x + 0.25 * attacker.facing, attacker.y + 1.6, 0.02, 1, 0xe2e8f0, 'breath', 0.35);
      },
      update: (state, attacker, _opponent, elapsedSec) => {
        if (state.tick % 16 === 0 && elapsedSec < 0.8) {
          spawnParticles(state, attacker.x + 0.25 * attacker.facing, attacker.y + 1.6, 0.02, 1, 0xe2e8f0, 'breath', 0.28);
        }
      },
    },

    // 0.8: a giant shawarma (cylinder wrapped in a tan pita) floats above the ring.
    {
      startTime: 0.8,
      action: (state, _attacker, opponent) => {
        const ss = state.matthewSleepSuper;
        if (!ss) return;
        ss.shawarmaVisible = true;
        ss.shawarmaY = 3.6;
        ss.craterX = opponent.x;

        spawnParticles(state, ss.craterX, ss.shawarmaY, 0, 18, 0xfde68a, 'star', 0.35);
        soundEngine.playWhoosh(1.4);
      },
    },

    // 1.5: Matthew scales up smoothly to 3x and rises into the air toward the shawarma.
    {
      startTime: 1.5,
      action: (state, _attacker, _opponent) => {
        const ss = state.matthewSleepSuper;
        if (!ss) return;
        ss.phase = 'GROW_FLOAT';
      },
      update: (state, attacker, _opponent, elapsedSec) => {
        const ss = state.matthewSleepSuper;
        if (!ss || elapsedSec >= 3.0) return;
        // From 1.5 to 3.0 (duration 1.5s): scale up smoothly to 3x and rise toward shawarma
        const t = Math.min(1.0, Math.max(0.0, (elapsedSec - 1.5) / 1.45));
        ss.matthewScale = 1.0 + t * 2.0; // scales smoothly 1.0 to 3.0
        attacker.y = t * 3.4;
        ss.matthewY = attacker.y;

        const targetX = ss.craterX - 0.25 * attacker.facing;
        attacker.x = attacker.x + (targetX - attacker.x) * 0.08;

        if (state.tick % 8 === 0) {
          spawnParticles(state, attacker.x, attacker.y + 1.2, 0, 2, 0xfacc15, 'star', 0.22);
        }
      },
    },

    // 3.0: he drops down fast onto the opponent: big impact, strong screen shake, shockwave ring, a dark crater decal on the floor. Apply 45% damage.
    {
      startTime: 3.0,
      action: (state, attacker, opponent) => {
        const ss = state.matthewSleepSuper;
        if (!ss) return;
        attacker.y = 0;
        attacker.x = opponent.x;
        ss.matthewY = 0;
        ss.phase = 'BELLY_FLOP';
        ss.craterVisible = true;
        ss.shawarmaVisible = false;

        opponent.pancakeTicks = 65;

        soundEngine.playSuperHit();
        state.screenShake = 28;
        state.hitStopTicks = 16;

        // Shockwave ring & big impact particles
        spawnParticles(state, ss.craterX, 0.15, 0, 35, 0xfacc15, 'shield', 0.5);
        spawnParticles(state, ss.craterX, 0.15, 0, 25, 0xef4444, 'spark', 0.4);
        spawnParticles(state, ss.craterX, 0.2, 0, 20, 0x334155, 'spark', 0.35);

        if (!ss.damageApplied) {
          ss.damageApplied = true;
          const dmg = Math.round(opponent.maxHealth * 0.45);
          opponent.health = Math.max(0, opponent.health - dmg);
        }
      },
    },

    // 3.8: Matthew scales back to normal size, pop-up "Did the evening start yet?".
    {
      startTime: 3.8,
      action: (state, attacker, _opponent) => {
        const ss = state.matthewSleepSuper;
        if (!ss) return;
        ss.matthewScale = 1.0;
        ss.phase = 'WAKE_CONFUSED';

        spawnFloatingText(state, 'Did the evening start yet? 🤔', attacker.x, attacker.y + 2.0, '#38bdf8');
        soundEngine.playWhoosh(1.1);
      },
    },

    // 4.5: remove the shawarma and crater, unlock the opponent, back to normal.
    {
      startTime: 4.5,
      action: (state, attacker, opponent) => {
        const ss = state.matthewSleepSuper;
        if (ss) {
          ss.shawarmaVisible = false;
          ss.craterVisible = false;
        }
        state.matthewSleepSuper = null;

        opponent.actionState = 'IDLE';
        opponent.hitstunFrames = 0;
        opponent.pancakeTicks = 0;
        opponent.vx = 0;
        opponent.vy = 0;

        attacker.actionState = 'IDLE';
        attacker.currentMove = null;
        attacker.moveFrame = 0;
        attacker.y = 0;
        attacker.vx = 0;
        attacker.vy = 0;
      },
    },
  ],
};

export interface ActiveSuperTimelineRunner {
  timeline: SuperTimeline;
  attackerIndex: 1 | 2;
  defenderIndex: 1 | 2;
  elapsedSec: number;
  executedSteps: boolean[];
  isFinished: boolean;
}

let activeRunner: ActiveSuperTimelineRunner | null = null;

export function startSuperTimeline(
  timeline: SuperTimeline,
  state: GameState,
  attacker: FighterState,
  opponent: FighterState
) {
  // Spend the meter when the super starts
  attacker.superMeter = Math.max(0, attacker.superMeter - timeline.meterCost);

  activeRunner = {
    timeline,
    attackerIndex: attacker.playerIndex,
    defenderIndex: opponent.playerIndex,
    elapsedSec: 0,
    executedSteps: new Array(timeline.steps.length).fill(false),
    isFinished: false,
  };

  // Run step 0 (startTime: 0.0) immediately
  if (timeline.steps[0] && timeline.steps[0].startTime === 0.0) {
    timeline.steps[0].action(state, attacker, opponent);
    activeRunner.executedSteps[0] = true;
  }
}

/**
 * Super runner: plays the steps in order every frame.
 * The super is not finished until the last step runs and totalDuration is reached.
 */
export function updateActiveSuperTimeline(state: GameState) {
  if (!activeRunner || activeRunner.isFinished) return;

  const runner = activeRunner;
  const attacker = runner.attackerIndex === 1 ? state.p1 : state.p2;
  const opponent = runner.defenderIndex === 1 ? state.p1 : state.p2;

  runner.elapsedSec += 1 / 60; // 60 FPS tick

  if (state.matthewDoorSuper) {
    state.matthewDoorSuper.elapsedSec = runner.elapsedSec;
    state.matthewDoorSuper.tick++;
  }
  if (state.matthewSleepSuper) {
    state.matthewSleepSuper.elapsedSec = runner.elapsedSec;
    state.matthewSleepSuper.tick++;
  }

  // Play steps in order
  for (let i = 0; i < runner.timeline.steps.length; i++) {
    const step = runner.timeline.steps[i];
    if (runner.elapsedSec >= step.startTime && !runner.executedSteps[i]) {
      step.action(state, attacker, opponent);
      runner.executedSteps[i] = true;
    }

    if (step.update && runner.executedSteps[i]) {
      const nextStep = runner.timeline.steps[i + 1];
      if (!nextStep || runner.elapsedSec < nextStep.startTime) {
        step.update(state, attacker, opponent, runner.elapsedSec);
      }
    }
  }

  // Finished when all steps executed and totalDuration reached
  const allExecuted = runner.executedSteps.every((ex) => ex);
  if (allExecuted && runner.elapsedSec >= runner.timeline.totalDuration) {
    runner.isFinished = true;
    activeRunner = null;
  }
}

export function isSuperTimelineActive(): boolean {
  return activeRunner !== null && !activeRunner.isFinished;
}

export function resetSuperTimelines() {
  activeRunner = null;
}
