import {
  ActionState,
  AttackLevel,
  FighterState,
  FloatingEffect,
  GameState,
  InputFrame,
  MoveDefinition,
  MoveHitbox,
  ParticleEffect,
} from '../types/game';
import { soundEngine } from './audio';
import { InputBuffer } from './input/InputBuffer';
import { triggerHitEffects } from './effects.js';
import {
  MATTHEW_LVL2_TIMELINE,
  MATTHEW_LVL3_TIMELINE,
  startSuperTimeline,
  updateActiveSuperTimeline,
  resetSuperTimelines,
} from './superTimelines';

export const p1InputBuffer = new InputBuffer();
export const p2InputBuffer = new InputBuffer();

export function resetInputBuffers() {
  p1InputBuffer.clear();
  p2InputBuffer.clear();
  resetSuperTimelines();
}

export const GRAVITY = 0.015;
// Ring halfSize is 6.8; keeping fighters at least 1.5 units from the ropes gives bound of 5.3
export const STAGE_BOUND_X = 5.3;
export const PUSHBOX_WIDTH = 0.95;
export const MIN_FIGHTER_DIST = 0.95;
// Maximum separation: keeps fighters engaged within the 10.6 fight line
export const MAX_FIGHTER_DIST = 7.5;

/**
 * Resolves pushbox collision between two fighters.
 * Fighters have a body collision box that prevents them from overlapping or passing through each other,
 * including when one lands from a jump on top of the other (smoothly sliding them apart horizontally).
 */
export function resolvePushboxCollision(f1: FighterState, f2: FighterState) {
  const h1 = f1.isCrouching ? 1.25 : 1.95;
  const h2 = f2.isCrouching ? 1.25 : 1.95;

  // Check vertical overlap of body bounding boxes:
  const top1 = f1.y + h1;
  const bottom1 = f1.y;
  const top2 = f2.y + h2;
  const bottom2 = f2.y;

  const verticalOverlap = bottom1 < top2 && top1 > bottom2;
  if (!verticalOverlap) return;

  const requiredDist = PUSHBOX_WIDTH;
  const dx = f1.x - f2.x;
  const dist = Math.abs(dx);

  if (dist < requiredDist) {
    const overlap = requiredDist - dist;
    let dir = 0;
    if (dist > 0.001) {
      dir = dx > 0 ? 1 : -1;
    } else {
      // Exactly on top of each other (e.g. landing from jump): separate based on player index
      dir = f1.playerIndex === 1 ? -1 : 1;
    }

    let push1 = (overlap * 0.5) * dir;
    let push2 = -(overlap * 0.5) * dir;

    // Apply horizontal pushes
    f1.x += push1;
    f2.x += push2;

    // Handle stage boundary collisions and push transfer
    if (f1.x < -STAGE_BOUND_X) {
      const overflow = -STAGE_BOUND_X - f1.x;
      f1.x = -STAGE_BOUND_X;
      f2.x += overflow;
      if (f1.vx < 0) f1.vx = 0;
    } else if (f1.x > STAGE_BOUND_X) {
      const overflow = STAGE_BOUND_X - f1.x;
      f1.x = STAGE_BOUND_X;
      f2.x += overflow;
      if (f1.vx > 0) f1.vx = 0;
    }

    if (f2.x < -STAGE_BOUND_X) {
      const overflow = -STAGE_BOUND_X - f2.x;
      f2.x = -STAGE_BOUND_X;
      f1.x += overflow;
      if (f2.vx < 0) f2.vx = 0;
    } else if (f2.x > STAGE_BOUND_X) {
      const overflow = STAGE_BOUND_X - f2.x;
      f2.x = STAGE_BOUND_X;
      f1.x += overflow;
      if (f2.vx > 0) f2.vx = 0;
    }

    // Strict boundary clamping
    f1.x = Math.max(-STAGE_BOUND_X, Math.min(STAGE_BOUND_X, f1.x));
    f2.x = Math.max(-STAGE_BOUND_X, Math.min(STAGE_BOUND_X, f2.x));

    // Reduce horizontal velocity pushing towards each other
    if (dir > 0) {
      if (f1.vx < 0) f1.vx *= 0.1;
      if (f2.vx > 0) f2.vx *= 0.1;
    } else {
      if (f1.vx > 0) f1.vx *= 0.1;
      if (f2.vx < 0) f2.vx *= 0.1;
    }
  }
}

export interface HitResult {
  hitLanded: boolean;
  blocked: boolean;
  damage: number;
  text: string;
}

/**
 * Checks AABB intersection between two 2D rectangles
 */
export function checkAABB(
  x1: number,
  y1: number,
  w1: number,
  h1: number,
  x2: number,
  y2: number,
  w2: number,
  h2: number
): boolean {
  return (
    Math.abs(x1 - x2) * 2 < w1 + w2 &&
    Math.abs(y1 - y2) * 2 < h1 + h2
  );
}

/**
 * Gets the current hurtbox of a fighter based on their state
 */
export function getFighterHurtbox(f: FighterState) {
  if (f.isCrouching) {
    return {
      x: f.x,
      y: f.y + 0.65,
      width: 0.9,
      height: 1.1,
    };
  }
  return {
    x: f.x,
    y: f.y + 1.05,
    width: 0.85,
    height: 1.85,
  };
}

/**
 * Tests hitboxes against defender hurtbox and applies damage/knockback
 */
export function testHitboxCollision(
  attacker: FighterState,
  defender: FighterState,
  state: GameState
): HitResult | null {
  if (!attacker.currentMove) {
    return null;
  }

  // 1. Invincibility check (0.5 sec post-wakeup invincibility)
  if (defender.invincibleTicks && defender.invincibleTicks > 0) {
    return null;
  }

  // Cannot hit opponent while they are being grabbed in a throw
  if (defender.throwGrabbedTicks && defender.throwGrabbedTicks > 0) {
    return null;
  }

  // 2. Knockdown check (cannot hit opponent while grounded on the mat)
  if (defender.actionState === 'KNOCKDOWN' && (!defender.quickRollTicks || defender.quickRollTicks <= 0)) {
    return null;
  }

  // 3. Juggle limit check (max 3 hits on airborne opponent, then they fall safely)
  if (!defender.isGrounded && (defender.juggleCount || 0) >= 3) {
    return null;
  }

  // Check if current frame has active hitboxes
  const move = attacker.currentMove;
  const currentFrame = attacker.moveFrame;

  const activeHitboxIndex = move.hitboxes.findIndex(
    (hb) => currentFrame >= hb.startFrame && currentFrame < hb.startFrame + hb.duration
  );

  if (activeHitboxIndex === -1) {
    return null;
  }

  // For multi-hit moves (multiple hitboxes), each hitbox can hit once; for single-hitbox moves, check hasHitThisMove
  if (move.hitboxes.length <= 1) {
    if (attacker.hasHitThisMove) return null;
  } else {
    if (attacker.lastHitboxIndex === activeHitboxIndex) return null;
  }

  const activeHitbox: MoveHitbox = move.hitboxes[activeHitboxIndex];

  // Calculate world coordinates of hitbox
  const hbWorldX = attacker.x + activeHitbox.offsetX * attacker.facing;
  const hbWorldY = attacker.y + activeHitbox.offsetY;

  const hurtbox = getFighterHurtbox(defender);

  const isColliding = checkAABB(
    hbWorldX,
    hbWorldY,
    activeHitbox.width,
    activeHitbox.height,
    hurtbox.x,
    hurtbox.y,
    hurtbox.width,
    hurtbox.height
  );

  if (!isColliding) {
    return null;
  }

  // 4. High / Mid / Low classification
  let attackLevel: AttackLevel = activeHitbox.attackLevel || move.attackLevel || 'mid';
  if (!activeHitbox.attackLevel && !move.attackLevel) {
    if (
      move.type === 'LIGHT_PUNCH' ||
      move.animType === 'lp' ||
      move.type === 'HEAVY_KICK' ||
      move.animType === 'hk' ||
      move.animType === 'the_big_lie'
    ) {
      attackLevel = 'high';
    } else if (
      move.type === 'LIGHT_KICK' ||
      move.animType === 'lk' ||
      move.name.includes('Shin') ||
      move.name.includes('Sweep')
    ) {
      attackLevel = 'low';
    } else {
      attackLevel = 'mid';
    }
  }

  // 5. Crouching ducks under high attacks!
  if (attackLevel === 'high' && defender.isCrouching && defender.isGrounded) {
    return null;
  }

  // Check if defender is in "Ear Radar" counter stance:
  if (defender.earRadarTicks && defender.earRadarTicks > 0) {
    defender.earRadarTicks = 0;
    attacker.hasHitThisMove = true;
    soundEngine.playHeavyHit();
    state.screenShake = 16;
    state.hitStopTicks = 12;
    // 30% reduced damage
    const counterDmg = Math.round(88 * defender.config.stats.powerMultiplier * 0.70);
    attacker.health = Math.max(0, attacker.health - counterDmg);
    attacker.hitstunFrames = 36;
    attacker.actionState = 'HITSTUN';
    attacker.vx = -defender.facing * 0.45;
    attacker.vy = 0.18;
    attacker.isGrounded = false;
    attacker.eyePop = 1.0;
    attacker.wobbleAngle = defender.facing * 0.5;

    defender.actionState = 'ATTACKING';
    defender.currentMove = {
      name: 'Ear Radar Headbutt Counter',
      type: 'LIGHT_KICK',
      startupFrames: 2,
      activeFrames: 8,
      recoveryFrames: 14,
      totalFrames: 24,
      damage: 62,
      meterGain: 18,
      isHeavy: true,
      animType: 'nose_poke',
      hitboxes: [],
    };
    defender.moveFrame = 0;
    defender.hasHitThisMove = true;

    // Single pop-up text for counter
    spawnFloatingText(state, 'EAR RADAR COUNTER!', defender.x, defender.y + 2.0, '#22c55e');
    spawnParticles(state, (defender.x + attacker.x) / 2, defender.y + 1.4, 0, 20, 0x22c55e, 'spark');
    return { hitLanded: true, blocked: false, damage: counterDmg, text: 'EAR RADAR!' };
  }

  // Check if defender is in "It Wasn't Me!" fake KO counter stance:
  if (defender.counterStanceTicks && defender.counterStanceTicks > 0) {
    defender.counterStanceTicks = 0;
    // Auto-counter with wrench uppercut!
    attacker.hasHitThisMove = true;
    soundEngine.playHeavyHit();
    state.screenShake = 16;
    state.hitStopTicks = 12;
    // 30% reduced damage
    const counterDmg = Math.round(91 * defender.config.stats.powerMultiplier * 0.70);
    attacker.health = Math.max(0, attacker.health - counterDmg);
    attacker.hitstunFrames = 38;
    attacker.actionState = 'HITSTUN';
    attacker.vx = -defender.facing * 0.2;
    attacker.vy = 0.38; // Launch attacker high up!
    attacker.isGrounded = false;
    attacker.eyePop = 1.0;
    attacker.wobbleAngle = defender.facing * 0.6;

    // Put defender into counter uppercut attack
    defender.actionState = 'ATTACKING';
    defender.currentMove = {
      name: 'Counter Wrench Uppercut',
      type: 'HEAVY_PUNCH',
      startupFrames: 2,
      activeFrames: 10,
      recoveryFrames: 16,
      totalFrames: 28,
      damage: 64,
      meterGain: 20,
      isHeavy: true,
      animType: 'wrench_launcher',
      hitboxes: [],
    };
    defender.moveFrame = 0;
    defender.hasHitThisMove = true;
    defender.y = 0;
    defender.vy = 0.12;

    spawnFloatingText(state, "IT WASN'T ME! COUNTER!", defender.x, defender.y + 2.0, '#f59e0b');
    spawnParticles(state, (defender.x + attacker.x) / 2, defender.y + 1.4, 0, 20, 0xfacc15, 'spark');
    return { hitLanded: true, blocked: false, damage: counterDmg, text: "IT WASN'T ME!" };
  }

  // Hit connects!
  attacker.hasHitThisMove = true;
  attacker.lastHitboxIndex = activeHitboxIndex;

  // Check if defender is blocking:
  // Must be holding block/back and facing towards the attacker
  const isFacingAttacker = (defender.x > attacker.x && defender.facing === -1) ||
                           (defender.x < attacker.x && defender.facing === 1);
  const isBlockActive = defender.isBlocking && isFacingAttacker && defender.actionState !== 'ATTACKING';

  let isBlocked = false;
  if (isBlockActive) {
    if (move.animType === 'door_to_door' || move.animType === 'sleeping_giant') {
      isBlocked = false;
    } else if (defender.isCrouching) {
      // Crouch block (hold ↓ + BLOCK) blocks low and mid
      if (attackLevel === 'low' || attackLevel === 'mid') {
        isBlocked = true;
      }
    } else {
      // Standing block blocks high and mid (low attacks bypass standing block!)
      if (attackLevel === 'high' || attackLevel === 'mid') {
        isBlocked = true;
      }
    }
  }

  if (isBlocked) {
    // Blocked hit: 30% reduced chip damage
    const chipDmg = Math.max(1, Math.round(activeHitbox.damage * 0.15 * 0.70));
    defender.health = Math.max(1, defender.health - chipDmg);
    defender.blockstunFrames = activeHitbox.blockstun;
    defender.actionState = 'BLOCKSTUN';

    // Blocking ends and resets any combo counter
    attacker.comboCount = 0;
    defender.comboCount = 0;

    // Pushback
    defender.vx = activeHitbox.knockbackX * 0.6 * attacker.facing;
    attacker.vx = -activeHitbox.knockbackX * 0.3 * attacker.facing;

    attacker.superMeter = Math.min(attacker.maxSuperMeter, attacker.superMeter + 2);
    defender.superMeter = Math.min(defender.maxSuperMeter, defender.superMeter + 4); // Blocking a hit: +4

    soundEngine.playBlock();

    spawnFloatingText(state, 'BLOCK!', (defender.x + hbWorldX) / 2, hbWorldY + 0.3, '#38bdf8');
    // Blue shield flash effect: distinct blue shield particle burst at exact contact point
    spawnParticles(state, hbWorldX, hbWorldY, 0, 16, 0x38bdf8, 'shield', 0.28);
    spawnParticles(state, hbWorldX, hbWorldY, 0, 8, 0x93c5fd, 'spark', 0.16);

    state.screenShake = 1.5;
    state.hitStopTicks = 3;

    // Short tactile vibration on block
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {}
    }

    return { hitLanded: true, blocked: true, damage: chipDmg, text: 'BLOCK!' };
  }

  // Clean hit!
  // Airborne juggle tracking (max 3 hits on airborne opponent)
  if (!defender.isGrounded) {
    defender.juggleCount = (defender.juggleCount || 0) + 1;
  }

  // Combo damage scaling: each extra hit in a combo does 10% less damage (minimum 50%)
  const scaling = Math.max(0.50, 1.0 - defender.comboCount * 0.10);
  const isSuper = move.isSuper || activeHitbox.soundType === 'super';
  const isHeavy = activeHitbox.isHeavy || activeHitbox.soundType === 'heavy';
  // Basic attacks, specials, and combos reduced by 30% (* 0.70); supers preserve full defined percentages
  const damageMultiplier = isSuper ? 1.0 : 0.70;
  let baseDamage = Math.round(activeHitbox.damage * attacker.config.stats.powerMultiplier * damageMultiplier);
  let specialPopText: string | null = null;
  let specialPopColor: string | null = null;

  if (attacker.glassesGlintBuff) {
    baseDamage = Math.round(baseDamage * 2.0);
    attacker.glassesGlintBuff = false;
    specialPopText = '★ 2X GLASSES GLINT! ★';
    specialPopColor = '#facc15';
    spawnParticles(state, hbWorldX, hbWorldY, 0, 25, 0xfacc15, 'star');
  }

  // Moshon Level 2 Overclocked bonus damage & hit counting
  if (attacker.overclockedTicks && attacker.overclockedTicks > 0) {
    baseDamage = Math.round(baseDamage * 1.25); // +25% bonus electric damage
    attacker.overclockedHitCount = (attacker.overclockedHitCount || 0) + 1;
    spawnParticles(state, hbWorldX, hbWorldY, 0, 15, 0x38bdf8, 'spark');

    // 5 hits during Overclocked freezes opponent in FATAL ERROR screen for 1.5s
    if (attacker.overclockedHitCount >= 5) {
      attacker.overclockedHitCount = 0;
      defender.fatalErrorTicks = 90; // 1.5 seconds freeze
      defender.hitstunFrames = Math.max(defender.hitstunFrames, 90);
      defender.actionState = 'HITSTUN';
      soundEngine.playSuperHit();
      state.screenShake = 16;
      specialPopText = '💻 FATAL ERROR!';
      specialPopColor = '#38bdf8';
      spawnParticles(state, defender.x, defender.y + 1.2, 0, 30, 0x38bdf8, 'spark');
    }
  }

  const finalDamage = Math.max(1, Math.round(baseDamage * scaling));

  defender.health = Math.max(0, defender.health - finalDamage);
  // Fixed hitstun duration: light hit ~0.3 sec (18 ticks), heavy hit ~0.5 sec (30 ticks)
  const stunDuration = activeHitbox.isHeavy ? 30 : 18;
  defender.hitstunFrames = stunDuration;
  defender.actionState = 'HITSTUN';
  defender.comboCount++;

  // Knockback physics: respect knockbackY (e.g. wrench launcher sends opponent flying up!)
  const invWeight = 1 / defender.config.stats.weight;
  defender.vx = activeHitbox.knockbackX * attacker.facing * invWeight;
  const upwardPush = (activeHitbox.knockbackY !== undefined && activeHitbox.knockbackY !== 0)
    ? activeHitbox.knockbackY
    : (activeHitbox.isHeavy ? 0.05 : 0.0);
  defender.vy = upwardPush * invWeight;

  if (activeHitbox.isHeavy || upwardPush > 0.1) {
    defender.isGrounded = false;
  }

  // Super meter buildup (exact rules for player and CPU alike):
  // Landing a hit: +10, Landing a special move: +15, Taking a hit: +6
  const isSpecialMove = Boolean(
    attacker.config.specials?.some(s => s.move.name === move.name || s.move.animType === move.animType)
  );
  const attackerGain = isSpecialMove ? 15 : 10;
  if (!isSuper) {
    attacker.superMeter = Math.min(attacker.maxSuperMeter, attacker.superMeter + attackerGain);
  }
  defender.superMeter = Math.min(defender.maxSuperMeter, defender.superMeter + 6);

  // Special & Ultimate Super Impacts
  if (move.name === 'SHORT CIRCUIT' || move.animType === 'short_circuit') {
    state.screenShake = 22;
    state.hitStopTicks = 16;
    soundEngine.playSuperHit();
    defender.shockedTicks = 60; // 3 x-ray skeleton flashes & smoking ears!
    specialPopText = '⚡ ZZZAP! ⚡';
    specialPopColor = '#38bdf8';
    // Big blue electric sparks
    for (let s = 0; s < 25; s++) {
      spawnParticles(state, defender.x, defender.y + 1.2, 0, 1, 0x38bdf8, 'spark');
      spawnParticles(state, defender.x, defender.y + 1.5, 0, 1, 0x60a5fa, 'spark');
    }
  } else if (move.name === "LINOY'S RAGE!" || move.animType === 'linoy_rage') {
    state.screenShake = 35;
    state.hitStopTicks = 22;
    state.slowMoTicks = 60;
    state.slowMoFactor = 0.10;
    soundEngine.playSuperHit();
    // Giant fiery-electric blast explosion!
    for (let f = 0; f < 35; f++) {
      spawnParticles(state, defender.x, defender.y + 1.2, 0, 1, 0xef4444, 'spark');
      spawnParticles(state, defender.x, defender.y + 1.2, 0, 1, 0x38bdf8, 'spark');
      spawnParticles(state, defender.x, defender.y + 1.2, 0, 1, 0xf59e0b, 'star');
    }
    specialPopText = "💥 LINOY'S RAGE EXPLOSION! 💥";
    specialPopColor = '#ef4444';
    defender.vx = 0.75 * attacker.facing * invWeight;
    defender.vy = 0.45 * invWeight;
    defender.isGrounded = false;
  } else if (move.name === 'Holon Parking' || move.animType === 'holon_car') {
    state.screenShake = 20;
    state.hitStopTicks = 14;
    soundEngine.playSuperHit();
    specialPopText = '🚗 PARKING IS MINE!';
    specialPopColor = '#38bdf8';
    spawnParticles(state, defender.x, defender.y + 1.2, 0, 20, 0x38bdf8, 'star');
  } else if (move.name === 'The Eliminator') {
    state.screenShake = 16;
    state.hitStopTicks = 12;
    soundEngine.playSuperHit();
    specialPopText = '⚡ ELIMINATED! ⚡';
    specialPopColor = '#facc15';
    spawnParticles(state, defender.x, defender.y + 1.3, 0, 18, 0xfacc15, 'star');
  } else if (move.name === 'Jasmine Power') {
    state.screenShake = 26;
    state.hitStopTicks = 16;
    state.slowMoTicks = 45;
    state.slowMoFactor = 0.15;
    soundEngine.playSuperHit();
    // Huge heart-shaped explosion & pop-up
    for (let h = 0; h < 25; h++) {
      spawnParticles(state, defender.x, defender.y + 1.2, 0, 1, 0xf472b6, 'heart');
    }
    specialPopText = '💖 HEART EXPLOSION! 💖';
    specialPopColor = '#f472b6';
    defender.vx = 0.65 * attacker.facing * invWeight; // flies across the ring!
    defender.vy = 0.35 * invWeight;
    defender.isGrounded = false;
  } else if (move.name === 'The Big Lie') {
    state.screenShake = 18;
    state.hitStopTicks = 12;
    soundEngine.playSuperHit();
    specialPopText = 'PINOCCHIO STAB!';
    specialPopColor = '#facc15';
    spawnParticles(state, defender.x, defender.y + 1.4, 0, 18, 0xfacc15, 'spark');
  } else if (move.name === 'SERVICE CALL!' || move.animType === 'service_van' || move.name === 'Excavator Operator') {
    state.screenShake = 22;
    state.hitStopTicks = 14;
    soundEngine.playSuperHit();
    // Opponent gets flattened like a pancake for a moment, then pops back up!
    defender.pancakeTicks = 35;
    defender.headSquashTimer = 16;
    defender.headSquashDirection = attacker.facing;
    specialPopText = 'PANCAKE!';
    specialPopColor = '#facc15';
    // Tire smoke and dust at road level
    for (let d = 0; d < 12; d++) {
      spawnParticles(state, defender.x + (Math.random() - 0.5) * 0.4, 0.1, 0, 1, 0x94a3b8, 'breath', 0.28);
    }
  } else if (
    move.animType === 'door_to_door' ||
    move.name === 'DOOR-TO-DOOR SALES' ||
    move.animType === 'sleeping_giant' ||
    move.name === 'THE SLEEPING GIANT (ULTIMATE)'
  ) {
    return null;
  }

  if (isSuper) {
    soundEngine.playSuperHit();
    soundEngine.playCrowdCheer(2.2, 0.7);
    state.screenShake = 24; // strong shake for super
    state.hitStopTicks = 12; // 200ms hit-stop
  } else if (isHeavy) {
    soundEngine.playHeavyHit();
    soundEngine.playCrowdCheer(1.2, 0.45);
    state.screenShake = 9; // solid shake for heavy
    state.hitStopTicks = 7; // 120ms hit-stop
  } else {
    soundEngine.playLightHit();
    state.screenShake = 3; // tiny shake for light
    state.hitStopTicks = 4; // 60ms hit-stop
  }

  // Short tactile vibration on hit (navigator.vibrate)
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (isSuper) {
        navigator.vibrate([40, 30, 60]);
      } else if (isHeavy) {
        navigator.vibrate(50);
      } else {
        navigator.vibrate(25);
      }
    } catch {}
  }

  // Exaggerated comic visuals
  defender.eyePop = 1.0;
  defender.wobbleAngle = -attacker.facing * 0.5;

  const hitWords = [
    activeHitbox.humorText,
    'BONK!',
    'OUCH!',
    'WHAM!',
    'KAPOW!',
    'CRIT!',
    'BOOM!',
    'YEET!',
    'OOF!',
  ];
  const chosenWord = specialPopText || activeHitbox.humorText || hitWords[Math.floor(Math.random() * hitWords.length)];
  const textColor = specialPopColor || (isSuper ? '#ef4444' : isHeavy ? '#f97316' : '#eab308');

  // ONLY one pop-up text per move. Never show two texts for the same hit.
  if (!attacker.hasShownPopUpThisMove) {
    spawnFloatingText(state, chosenWord, (defender.x + hbWorldX) / 2, hbWorldY + 0.4, textColor);
    attacker.hasShownPopUpThisMove = true;
  }

  // Connect to visual effects system in effects.js
  triggerHitEffects(state, attacker, defender, activeHitbox, hbWorldX, hbWorldY, isHeavy, isSuper);

  return { hitLanded: true, blocked: false, damage: finalDamage, text: chosenWord };
}

/**
 * Spawns comic pop-up text
 */
export function spawnFloatingText(
  state: GameState,
  text: string,
  x: number,
  y: number,
  color: string = '#facc15'
) {
  const effect: FloatingEffect = {
    id: `txt_${Math.random().toString(36).substring(2, 9)}`,
    text,
    x,
    y,
    color,
    scale: 1.2,
    life: 38,
    maxLife: 38,
    vx: (Math.random() - 0.5) * 0.04,
    vy: 0.05 + Math.random() * 0.04,
    rotation: (Math.random() - 0.5) * 0.25,
  };
  state.floatingTexts.push(effect);
  // Max 1 on screen at once, guaranteed no duplicate or overlapping text
  if (state.floatingTexts.length > 1) {
    state.floatingTexts = state.floatingTexts.slice(-1);
  }
}

/**
 * Spawns 3D particles in the game state with pooling limit (max 150)
 */
export function spawnParticles(
  state: GameState,
  x: number,
  y: number,
  z: number,
  count: number,
  color: number,
  shape: 'star' | 'sweat' | 'spark' | 'heart' | 'shield' | 'blood' | 'tear' | 'breath' | 'tooth',
  baseSize: number = 0.18,
  customVel?: { vx?: number; vy?: number; vz?: number }
) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (0.04 + Math.random() * 0.12) * (baseSize > 0.25 ? 1.35 : 1.0);

    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed + 0.03;
    let vz = (Math.random() - 0.5) * 0.05;
    let life = 20 + Math.floor(Math.random() * 15);
    let maxLife = 35;

    if (shape === 'blood') {
      // Large bright red droplets bursting outward and upward
      vx = (Math.random() - 0.5) * 0.14;
      vy = 0.06 + Math.random() * 0.13;
      vz = (Math.random() - 0.5) * 0.12;
      life = 60 + Math.floor(Math.random() * 20);
      maxLife = 80;
    } else if (shape === 'tooth') {
      vx = customVel?.vx ?? -0.08;
      vy = customVel?.vy ?? 0.18;
      vz = (Math.random() - 0.5) * 0.08;
      life = 70;
      maxLife = 70;
    } else if (shape === 'sweat') {
      // Bright light-blue sweat drops
      vx = customVel?.vx ?? (Math.random() - 0.5) * 0.09;
      vy = customVel?.vy ?? (0.05 + Math.random() * 0.08);
      vz = (Math.random() - 0.5) * 0.06;
      life = 25 + Math.floor(Math.random() * 12);
      maxLife = 37;
    } else if (shape === 'tear') {
      // Bright blue tear droplets
      vx = customVel?.vx ?? ((Math.random() - 0.5) * 0.06);
      vy = customVel?.vy ?? (-0.01 - Math.random() * 0.03);
      vz = (Math.random() - 0.5) * 0.04;
      life = 35 + Math.floor(Math.random() * 15);
      maxLife = 50;
    } else if (shape === 'breath') {
      vx = customVel?.vx ?? 0.016;
      vy = customVel?.vy ?? 0.012;
      life = 32;
      maxLife = 32;
    }

    const p: ParticleEffect = {
      x,
      y,
      z: z + (Math.random() - 0.5) * 0.2,
      vx,
      vy,
      vz,
      color,
      size: baseSize * (0.85 + Math.random() * 0.35),
      life,
      maxLife,
      shape,
    };
    state.particles.push(p);
  }

  // Object pooling cap: limit particles to max 150 on screen for smooth mobile performance
  if (state.particles.length > 150) {
    state.particles = state.particles.slice(-150);
  }
}

function updateMatthewDoorToDoor(state: GameState, _f: FighterState, _opponent: FighterState) {
  updateActiveSuperTimeline(state);
}

function updateMatthewSleepingGiant(state: GameState, _f: FighterState, _opponent: FighterState) {
  updateActiveSuperTimeline(state);
}

/**
 * Updates fighter physics, movement, and boundaries
 */
export function updateFighterPhysics(
  f: FighterState,
  opponent: FighterState,
  input: InputFrame,
  state: GameState
) {
  // Record inputs with timestamps for motion and combo detection
  const buffer = f.playerIndex === 1 ? p1InputBuffer : p2InputBuffer;
  const entry = buffer.record(input, f.facing);

  // Eye pop decay
  if (f.eyePop > 0) {
    f.eyePop = Math.max(0, f.eyePop - 0.05);
  }
  // Wobble angle recovery
  if (Math.abs(f.wobbleAngle) > 0.01) {
    f.wobbleAngle *= 0.88;
  } else {
    f.wobbleAngle = 0;
  }

  // Smooth display health catchup
  if (f.displayHealth > f.health) {
    f.displayHealth = Math.max(f.health, f.displayHealth - (f.displayHealth - f.health) * 0.08 - 0.5);
  }

  // Face squash recovery
  if (f.headSquashTimer && f.headSquashTimer > 0) {
    f.headSquashTimer--;
  }

  // Pancake flattened recovery (pops back up)
  if (f.pancakeTicks && f.pancakeTicks > 0) {
    f.pancakeTicks--;
  }

  // Dazed recovery (circling stars after knockdown)
  if (f.dazedTicks && f.dazedTicks > 0) {
    f.dazedTicks--;
  }
  if (f.actionState === 'KNOCKDOWN' || (f.wakeupTicks && f.wakeupTicks > 0)) {
    f.dazedTicks = Math.max(f.dazedTicks || 0, 45);
  }

  // Below 50% health: drops fall constantly (bright light-blue sweat drops)
  if (f.health <= f.maxHealth * 0.50 && state.tick % 16 === 0 && !f.isKo) {
    spawnParticles(
      state,
      f.x + (Math.random() - 0.5) * 0.35,
      f.y + 1.75,
      (Math.random() - 0.5) * 0.2,
      1,
      0x38bdf8,
      'sweat',
      0.20
    );
  }

  // Below 20% health: cartoon tear streams from the eyes
  if (f.health <= f.maxHealth * 0.20 && state.tick % 12 === 0 && !f.isKo) {
    spawnParticles(state, f.x + 0.12 * f.facing, f.y + 1.68, 0.05, 1, 0x60a5fa, 'tear', 0.22);
    spawnParticles(state, f.x - 0.05 * f.facing, f.y + 1.68, 0.05, 1, 0x60a5fa, 'tear', 0.22);
  }

  // Breath: small puffs from the mouth when health is low (<= 30%)
  if (f.health <= f.maxHealth * 0.30 && state.tick % 45 === 0 && !f.isKo && f.isGrounded && f.actionState !== 'HITSTUN') {
    spawnParticles(
      state,
      f.x + 0.26 * f.facing,
      f.y + 1.55,
      0.02,
      1,
      0xe2e8f0,
      'breath',
      0.26,
      { vx: 0.016 * f.facing, vy: 0.012 }
    );
  }

  // Handle throw grabbed state (300ms window = 18 ticks to break the throw)
  if (f.throwGrabbedTicks && f.throwGrabbedTicks > 0) {
    f.throwGrabbedTicks--;
    f.actionState = 'HITSTUN';
    f.vx = 0;
    f.vy = 0;

    // Throw break: "Pressing LP + LK within 300ms of being grabbed breaks the throw."
    if (buffer.isThrowAttempt()) {
      buffer.consumeThrow();
      f.throwGrabbedTicks = 0;
      f.throwAttackerIndex = undefined;
      f.actionState = 'IDLE';

      if (opponent.currentMove?.name === 'Throw Slam') {
        opponent.actionState = 'IDLE';
        opponent.currentMove = null;
        opponent.moveFrame = 0;
      }

      // Both fighters push apart
      f.vx = f.facing * 0.18;
      opponent.vx = -f.facing * 0.18;

      soundEngine.playBlock();
      state.screenShake = 6;
      spawnFloatingText(state, 'THROW TECH!', (f.x + opponent.x) * 0.5, f.y + 1.9, '#38bdf8');
      spawnParticles(state, (f.x + opponent.x) * 0.5, f.y + 1.3, 0, 16, 0x38bdf8, 'shield', 0.28);
      return;
    }

    if (f.throwGrabbedTicks === 0) {
      f.throwAttackerIndex = undefined;
      const throwDmg = Math.round(85 * opponent.config.stats.powerMultiplier * 0.70);
      f.health = Math.max(0, f.health - throwDmg);
      f.hitstunFrames = 30;
      f.actionState = 'HITSTUN';
      f.eyePop = 1.0;
      f.wobbleAngle = -opponent.facing * 0.7;
      f.vx = opponent.facing * 0.22;
      f.vy = 0.18;
      f.isGrounded = false;

      soundEngine.playHeavyHit();
      state.screenShake = 16;
      state.hitStopTicks = 8;
      spawnFloatingText(state, 'SLAM!', f.x, f.y + 1.4, '#ef4444');
      spawnParticles(state, f.x, 0.2, 0, 20, 0xf59e0b, 'spark', 0.35);
      spawnParticles(state, f.x, 0.1, 0, 15, 0x94a3b8, 'spark', 0.25);

      opponent.superMeter = Math.min(opponent.maxSuperMeter, opponent.superMeter + 7);
      f.superMeter = Math.min(f.maxSuperMeter, f.superMeter + 4);
    }
    return;
  }

  // Handle hitstun & blockstun states
  if (f.hitstunFrames > 0) {
    f.hitstunFrames--;
    f.actionState = 'HITSTUN';
    if (f.hitstunFrames === 0) {
      f.actionState = 'IDLE';
      f.comboCount = 0; // Combo ended
    }
  } else if (f.blockstunFrames > 0) {
    f.blockstunFrames--;
    f.actionState = 'BLOCKSTUN';
    if (f.blockstunFrames === 0) {
      f.actionState = 'IDLE';
    }
  }

  // Auto face opponent: fighters always automatically face each other
  f.facing = f.x <= opponent.x ? 1 : -1;
  f.z = 0;

  // Slow debuff decay and speed multiplier
  if (f.slowDebuffTicks && f.slowDebuffTicks > 0) {
    f.slowDebuffTicks--;
    if (Math.random() < 0.15) {
      spawnParticles(state, f.x, f.y + 0.3, 0, 1, 0x94a3b8, 'spark');
    }
  }

  // Shocked ticks decay (cartoon x-ray skeleton & smoke)
  if (f.shockedTicks && f.shockedTicks > 0) {
    f.shockedTicks--;
    if (Math.random() < 0.3) {
      spawnParticles(state, f.x, f.y + 1.3, 0, 1, 0x38bdf8, 'spark');
    }
  }

  // Fatal Error freeze decay (frozen solid inside blue error screen)
  if (f.fatalErrorTicks && f.fatalErrorTicks > 0) {
    f.fatalErrorTicks--;
    f.vx = 0;
    f.hitstunFrames = Math.max(f.hitstunFrames, f.fatalErrorTicks);
    f.actionState = 'HITSTUN';
    if (Math.random() < 0.25) {
      spawnParticles(state, f.x, f.y + 1.1, 0, 1, 0x38bdf8, 'spark');
    }
  }

  // Moshon Overclocked buff decay & particle trail (Speed x1.5)
  if (f.overclockedTicks && f.overclockedTicks > 0) {
    f.overclockedTicks--;
    if (Math.random() < 0.4) {
      spawnParticles(state, f.x, f.y + 1.2, 0, 1, 0x38bdf8, 'spark');
    }
  }
  const isOverclocked = (f.overclockedTicks && f.overclockedTicks > 0);
  const baseSpeedMult = (f.slowDebuffTicks && f.slowDebuffTicks > 0) ? 0.5 : 1.0;
  const speedMult = baseSpeedMult * (isOverclocked ? 1.5 : 1.0);

  // Counter stance decay
  if (f.counterStanceTicks && f.counterStanceTicks > 0) {
    f.counterStanceTicks--;
  }
  // Ear radar counter stance decay
  if (f.earRadarTicks && f.earRadarTicks > 0) {
    f.earRadarTicks--;
    if (Math.random() < 0.25) {
      spawnParticles(state, f.x, f.y + 1.8, 0, 1, 0x22c55e, 'spark');
    }
  }

  // Handle attacking state animation progression & custom move physics
  if (f.actionState === 'ATTACKING' && f.currentMove) {
    f.moveFrame++;

    // "Duct Tape Toss" projectile spawning
    if (f.currentMove.name === 'Duct Tape Toss' && f.moveFrame === 6 && !f.hasHitThisMove) {
      f.hasHitThisMove = true;
      if (!state.projectiles) state.projectiles = [];
      state.projectiles.push({
        id: `proj_${Math.random().toString(36).substring(2, 9)}`,
        ownerIndex: f.playerIndex,
        x: f.x + 0.9 * f.facing,
        y: f.y + 1.35,
        vx: 0.24 * f.facing,
        vy: 0,
        radius: 0.35,
        type: 'duct_tape',
        damage: 42,
        life: 120,
      });
      soundEngine.playWhoosh(1.3);
      spawnParticles(state, f.x + 0.9 * f.facing, f.y + 1.35, 0, 8, 0x94a3b8, 'spark');
    }

    // "It Wasn't Me!" fake KO window
    if (f.currentMove.name === "It Wasn't Me!" && f.moveFrame === 4) {
      f.counterStanceTicks = 60; // 1 second counter window
      spawnFloatingText(state, 'FAKING KO...', f.x, f.y + 1.2, '#94a3b8');
    }

    // "Maintenance Drill" forward rush
    if (f.currentMove.name === 'Maintenance Drill' && f.moveFrame < 24) {
      f.vx = 0.18 * f.facing;
    }

    // "Nose Poke" forward lunge
    if (f.currentMove.name === 'Nose Poke' && f.moveFrame >= 5 && f.moveFrame <= 14) {
      f.vx = 0.20 * f.facing;
    }

    // "SERVICE CALL!" service van forward drive, horn, flatten opponent, technician arrival
    if (
      f.currentMove.animType === 'service_van' ||
      f.currentMove.animType === 'excavator' ||
      f.currentMove.name === 'SERVICE CALL!' ||
      f.currentMove.name === 'Excavator Operator'
    ) {
      if (f.moveFrame === 8) {
        soundEngine.playWhoosh(1.4);
        spawnFloatingText(state, 'HONK! BEEP BEEP!', f.x, f.y + 2.3, '#facc15');
      }
      if (f.moveFrame === 32) {
        spawnFloatingText(state, '"Technician has arrived!"', f.x + 0.6 * f.facing, f.y + 2.3, '#38bdf8');
      }
      if (f.moveFrame >= 10 && f.moveFrame <= 26) {
        f.vx = 0.23 * f.facing;
      } else if (f.moveFrame >= 42) {
        f.vx = 0.27 * f.facing; // drives out of the ring!
      } else {
        f.vx *= 0.8;
      }
      if (f.moveFrame >= 10 && f.moveFrame <= 45 && f.moveFrame % 3 === 0) {
        spawnParticles(state, f.x - 0.8 * f.facing, 0.15, 0, 2, 0x94a3b8, 'breath', 0.22);
      }
    }

    // "Jasmine Power" kamikaze rocket dive
    if (f.currentMove.name === 'Jasmine Power' || (f.currentMove.isSuper && f.currentMove.animType === 'rocket_dive')) {
      if (f.moveFrame >= 12 && f.moveFrame <= 45) {
        f.vx = 0.38 * f.facing;
        f.vy = 0;
        f.y = Math.max(0.6, f.y);
        if (f.moveFrame % 2 === 0) {
          spawnParticles(state, f.x - 0.4 * f.facing, f.y + 0.8, 0, 3, 0xf472b6, 'heart');
        }
      }
    }

    // "Glasses Glint" double damage buff activation
    if (f.currentMove.name === 'Glasses Glint' && f.moveFrame === 6) {
      f.glassesGlintBuff = true;
      spawnFloatingText(state, '✨ 2x DAMAGE BUFF! ✨', f.x, f.y + 2.0, '#facc15');
      spawnParticles(state, f.x, f.y + 1.6, 0, 15, 0xfacc15, 'star');
    }

    // "Ear Radar" counter stance activation (0.5s counter window)
    if (f.currentMove.name === 'Ear Radar' && f.moveFrame === 3) {
      f.earRadarTicks = 30;
      spawnFloatingText(state, '📡 EAR RADAR ACTIVE! 📡', f.x, f.y + 1.9, '#22c55e');
      spawnParticles(state, f.x, f.y + 1.6, 0, 10, 0x22c55e, 'spark');
    }

    // "Zipper Uppercut" rising launch
    if (f.currentMove.name === 'Zipper Uppercut' && f.moveFrame >= 7 && f.moveFrame <= 15) {
      f.vy = 0.16;
      f.vx = 0.14 * f.facing;
      f.isGrounded = false;
      if (f.moveFrame % 2 === 0) {
        spawnParticles(state, f.x, f.y + 1.0, 0, 3, 0x38bdf8, 'spark');
      }
    }

    // "Car Door Slam" forward slam push
    if (f.currentMove.name === 'Car Door Slam' && f.moveFrame >= 7 && f.moveFrame <= 15) {
      f.vx = 0.18 * f.facing;
    }

    // "SHORT CIRCUIT" forward rush & wire jam
    if (f.currentMove.animType === 'short_circuit' || f.currentMove.name === 'SHORT CIRCUIT') {
      if (f.moveFrame >= 6 && f.moveFrame <= 18) {
        f.vx = 0.22 * f.facing;
      }
      if (f.moveFrame >= 8 && f.moveFrame <= 34 && f.moveFrame % 3 === 0) {
        spawnParticles(state, f.x + 0.9 * f.facing, f.y + 1.35, 0, 3, 0x38bdf8, 'spark');
      }
    }

    // "OVERCLOCKED" chip slap activation
    if (f.currentMove.animType === 'overclocked' || f.currentMove.name === 'OVERCLOCKED') {
      if (f.moveFrame === 8) {
        f.overclockedTicks = 360; // 6 seconds = 360 ticks
        f.overclockedHitCount = 0;
        spawnFloatingText(state, '⚡ OVERCLOCKED (SPEED x1.5 / 6s) ⚡', f.x, f.y + 2.1, '#38bdf8');
        spawnParticles(state, f.x, f.y + 1.3, 0, 25, 0x38bdf8, 'spark');
        soundEngine.playSuperHit();
      }
    }

    // "Holon Parking" white car charge
    if (f.currentMove.animType === 'holon_car' || f.currentMove.name === 'Holon Parking') {
      if (f.moveFrame >= 10 && f.moveFrame <= 30) {
        f.vx = 0.24 * f.facing;
      } else {
        f.vx *= 0.8;
      }
      if (f.moveFrame >= 10 && f.moveFrame <= 32 && f.moveFrame % 3 === 0) {
        spawnParticles(state, f.x - 0.8 * f.facing, f.y + 0.3, 0, 3, 0x94a3b8, 'spark');
      }
    }

    // "LINOY'S RAGE!" ultimate fury rush
    if (f.currentMove.animType === 'linoy_rage' || f.currentMove.name === "LINOY'S RAGE!") {
      if (f.moveFrame >= 14 && f.moveFrame <= 46) {
        f.vx = 0.28 * f.facing;
        if (f.moveFrame % 2 === 0) {
          spawnParticles(state, f.x, f.y + 1.2, 0, 4, 0xef4444, 'spark');
        }
      }
    }

    // --- Matthew Specials & Supers ---

    // "Belly Bounce" charge forward
    if (f.currentMove.animType === 'belly_bounce' || f.currentMove.name === 'Belly Bounce') {
      if (f.moveFrame >= 6 && f.moveFrame <= 20) {
        f.vx = 0.28 * f.facing;
      }
    }

    // "Door Shield" stationary guard
    if (f.currentMove.animType === 'door_shield' || f.currentMove.name === 'Door Shield') {
      f.vx = 0;
      if (f.moveFrame === 4) {
        spawnFloatingText(state, 'DOOR SHIELD UP!', f.x, f.y + 2.1, '#f59e0b');
        spawnParticles(state, f.x + 0.5 * f.facing, f.y + 1.2, 0, 10, 0xb45309, 'shield');
      }
    }

    // "Snack Break" eats pita to recover 5% health
    if (f.currentMove.animType === 'snack_break' || f.currentMove.name === 'Snack Break') {
      f.vx = 0;
      if (f.moveFrame === 24) {
        const healAmt = Math.max(1, Math.round(f.maxHealth * 0.05));
        f.health = Math.min(f.maxHealth, f.health + healAmt);
        spawnFloatingText(state, `+${healAmt} HP (PITA SNACK!)`, f.x, f.y + 2.2, '#22c55e');
        spawnParticles(state, f.x, f.y + 1.5, 0, 16, 0x22c55e, 'spark');
      }
    }

    // "Snore Wave" spawns giant "Zzz" projectile
    if (f.currentMove.animType === 'snore_wave' || f.currentMove.name === 'Snore Wave') {
      f.vx = 0;
      if (f.moveFrame === 12 && !f.hasHitThisMove) {
        f.hasHitThisMove = true;
        if (!state.projectiles) state.projectiles = [];
        state.projectiles.push({
          id: `snore_${Math.random().toString(36).substring(2, 9)}`,
          ownerIndex: f.playerIndex,
          x: f.x + 0.8 * f.facing,
          y: f.y + 1.4,
          vx: 0.20 * f.facing,
          vy: 0,
          radius: 0.45,
          type: 'snore_zzz',
          damage: 65,
          life: 120,
        });
        soundEngine.playWhoosh(1.2);
        spawnFloatingText(state, 'Zzz...', f.x + 0.8 * f.facing, f.y + 1.9, '#a855f7');
        spawnParticles(state, f.x + 0.8 * f.facing, f.y + 1.4, 0, 8, 0xa855f7, 'spark');
      }
    }

    // Level 1 Super: "DO THE MATH" rapid punch countdown & floating chalk formulas
    if (f.currentMove.animType === 'do_the_math' || f.currentMove.name === 'DO THE MATH') {
      if (f.moveFrame >= 8 && f.moveFrame <= 34) {
        f.vx = 0.14 * f.facing;
        const punchIndex = Math.floor((f.moveFrame - 8) / 4) + 1;
        if ((f.moveFrame - 8) % 4 === 0 && punchIndex <= 7) {
          // White chalk lines & sparkle dust
          spawnParticles(state, f.x + (0.9 + punchIndex * 0.05) * f.facing, f.y + 1.35, 0, 8, 0xffffff, 'spark');
        }
      }
    }

    // Level 2 Super: "DOOR-TO-DOOR SALES"
    if (f.currentMove && (f.currentMove.animType === 'door_to_door' || f.currentMove.name === 'DOOR-TO-DOOR SALES')) {
      updateMatthewDoorToDoor(state, f, opponent);
    }

    // Level 3 Ultimate: "THE SLEEPING GIANT"
    if (f.currentMove && (f.currentMove.animType === 'sleeping_giant' || f.currentMove.name === 'THE SLEEPING GIANT (ULTIMATE)')) {
      updateMatthewSleepingGiant(state, f, opponent);
    }

    // Safety: auto-ends after max duration and clears all temporary state
    if (f.currentMove && f.moveFrame >= f.currentMove.totalFrames) {
      if (state.matthewDoorSuper) state.matthewDoorSuper = null;
      if (state.matthewSleepSuper) state.matthewSleepSuper = null;
      f.currentMove = null;
      f.actionState = 'IDLE';
      f.moveFrame = 0;
      f.hasHitThisMove = false;
      f.hasShownPopUpThisMove = false;
      f.lastHitboxIndex = undefined;
      opponent.actionState = 'IDLE';
      opponent.hitstunFrames = 0;
      opponent.pancakeTicks = 0;
    }
  }

  // Process movement inputs if free to act
  const canAct =
    f.actionState !== 'ATTACKING' &&
    f.actionState !== 'HITSTUN' &&
    f.actionState !== 'BLOCKSTUN' &&
    state.stagePhase === 'FIGHTING';

  // Can cancel active or recovery frames into a combo chain or special move
  const canCancelCurrentAttack =
    f.actionState === 'ATTACKING' &&
    f.currentMove !== null &&
    f.moveFrame >= f.currentMove.startupFrames &&
    state.stagePhase === 'FIGHTING';

  let executedSpecialOrCombo = false;

  // 1. Check Special Moves from input buffer motions (QCF, Double-tap forward, Back-Forward, Down-Down)
  if (f.config.specials && f.config.specials.length > 0) {
    for (const special of f.config.specials) {
      const isButtonPressed =
        (special.button === 'LP' && (entry.pressedLP || (canAct && input.lightPunch && entry.forward))) ||
        (special.button === 'HP' && (entry.pressedHP || (canAct && input.heavyPunch && entry.forward))) ||
        (special.button === 'LK' && (entry.pressedLK || (canAct && input.lightKick && entry.forward))) ||
        (special.button === 'HK' && (entry.pressedHK || (canAct && input.heavyKick && entry.forward)));

      if (isButtonPressed) {
        const detected = buffer.checkMotionCommand(special.button);
        if (detected === special.command && (canAct || canCancelCurrentAttack)) {
          startMove(f, special.move, state);
          soundEngine.playWhoosh(1.35);
          spawnParticles(state, f.x + 0.5 * f.facing, f.y + 1.3, 0, 10, 0x38bdf8, 'spark');
          executedSpecialOrCombo = true;
          break;
        }
      }
    }
  }

  // 2. Check 3-Tier Super System:
  // Level 1: S1 Button OR ↓ → + HP (QCF+HP) - Cost 100
  // Level 2: S2 Button OR ↓ ← + HK (QCB+HK) - Cost 200
  // Level 3: S3 Button OR ↓ ↓ + LP + HP (DOWN_DOWN+HP) - Cost 300
  const lvl1Def = f.config.supers?.find((s) => s.level === 1) || {
    move: f.config.moves.SUPER_MOVE,
    command: 'QCF' as const,
    button: 'HP' as const,
  };
  const lvl2Def = f.config.supers?.find((s) => s.level === 2);
  const lvl3Def = f.config.supers?.find((s) => s.level === 3) || f.config.superSpecial;

  // Level 3 Ultimate Check:
  const isLvl3Motion =
    buffer.checkMotionCommand('HP') === 'DOWN_DOWN' ||
    buffer.checkMotionCommand('LP') === 'DOWN_DOWN' ||
    (buffer.checkMotionCommand('HK') === 'DOWN_DOWN' && f.config.id === 'fighter_kyle');
  const isLvl3Button =
    (entry.pressedHP && input.lightPunch) ||
    (entry.pressedLP && input.heavyPunch) ||
    (entry.pressedHP && isLvl3Motion) ||
    (entry.pressedHK && isLvl3Motion);
  const isLvl3Direct = entry.pressedSuper3 || input.super3 || input.superLevel === 3;

  if (!executedSpecialOrCombo && f.superMeter >= 300 && lvl3Def) {
    if ((isLvl3Direct || (isLvl3Motion && isLvl3Button)) && (canAct || canCancelCurrentAttack)) {
      f.superMeterHoldTicks = 0;
      startMove(f, lvl3Def.move, state);
      executedSpecialOrCombo = true;
    }
  }

  // Level 2 Super Check:
  const isLvl2Motion = buffer.checkMotionCommand('HK') === 'QCB' && (entry.pressedHK || input.heavyKick);
  const isLvl2Direct = entry.pressedSuper2 || input.super2 || input.superLevel === 2;

  if (!executedSpecialOrCombo && f.superMeter >= 200 && lvl2Def) {
    if ((isLvl2Direct || isLvl2Motion) && (canAct || canCancelCurrentAttack)) {
      f.superMeterHoldTicks = 0;
      startMove(f, lvl2Def.move, state);
      executedSpecialOrCombo = true;
    }
  }

  // Level 1 Super Check:
  const isLvl1Motion = buffer.checkMotionCommand('HP') === 'QCF' && (entry.pressedHP || input.heavyPunch);
  const isLvl1Direct =
    entry.pressedSuper1 ||
    input.super1 ||
    input.superLevel === 1 ||
    (entry.pressedSuper && !entry.pressedSuper2 && !entry.pressedSuper3);

  if (!executedSpecialOrCombo && f.superMeter >= 100) {
    if ((isLvl1Direct || isLvl1Motion) && (canAct || canCancelCurrentAttack)) {
      f.superMeterHoldTicks = 0;
      startMove(f, lvl1Def.move, state);
      executedSpecialOrCombo = true;
    }
  }

  // 3. Check Combo Attack Chaining during active/recovery frames
  if (!executedSpecialOrCombo && canCancelCurrentAttack && f.config.combos && f.config.combos.length > 0) {
    for (const combo of f.config.combos) {
      if (combo.fromMoveName === f.currentMove!.name) {
        const isNextPressed =
          (combo.nextButton === 'LP' && entry.pressedLP) ||
          (combo.nextButton === 'HP' && entry.pressedHP) ||
          (combo.nextButton === 'LK' && entry.pressedLK) ||
          (combo.nextButton === 'HK' && entry.pressedHK);

        if (isNextPressed) {
          startMove(f, combo.nextMove, state);
          spawnParticles(state, f.x + 0.6 * f.facing, f.y + 1.3, 0, 8, 0xfacc15, 'spark');
          executedSpecialOrCombo = true;
          break;
        }
      }
    }
  }

  // 4. Check Throw: LP + LK pressed at the same time (within 100ms of each other) close to opponent
  const isCloseToOpponent =
    Math.abs(f.x - opponent.x) <= 1.45 &&
    Math.abs(f.y - opponent.y) <= 0.6 &&
    ((f.x <= opponent.x && f.facing === 1) || (f.x >= opponent.x && f.facing === -1));

  const isLightStartupCancel =
    f.actionState === 'ATTACKING' &&
    f.moveFrame <= 6 &&
    (f.currentMove?.type === 'LIGHT_PUNCH' || f.currentMove?.type === 'LIGHT_KICK');

  const canAttemptThrow = (canAct || isLightStartupCancel) && f.isGrounded;

  if (!executedSpecialOrCombo && canAttemptThrow && buffer.isThrowAttempt()) {
    if (
      isCloseToOpponent &&
      !opponent.throwGrabbedTicks &&
      !(opponent.invincibleTicks && opponent.invincibleTicks > 0) &&
      opponent.actionState !== 'KNOCKDOWN'
    ) {
      buffer.consumeThrow();
      f.actionState = 'ATTACKING';
      f.currentMove = {
        name: 'Throw Slam',
        type: 'LIGHT_PUNCH',
        startupFrames: 2,
        activeFrames: 18,
        recoveryFrames: 12,
        totalFrames: 32,
        damage: 85,
        meterGain: 15,
        isHeavy: true,
        animType: 'wrench_launcher',
        hitboxes: [],
      };
      f.moveFrame = 0;
      f.hasHitThisMove = true;
      f.hasShownPopUpThisMove = false;
      soundEngine.playWhoosh(1.3);

      // Opponent enters grabbed state - 300ms (18 ticks) break window! Throws cannot be blocked!
      opponent.actionState = 'HITSTUN';
      opponent.throwGrabbedTicks = 18;
      opponent.throwAttackerIndex = f.playerIndex;
      opponent.vx = 0;
      opponent.vy = 0;
      opponent.x = f.x + f.facing * 0.9;
      spawnParticles(state, (f.x + opponent.x) * 0.5, f.y + 1.2, 0, 8, 0xfacc15, 'spark', 0.2);
      executedSpecialOrCombo = true;
    }
  }

  // 5. Basic actions and movement if free to act
  if (!executedSpecialOrCombo && canAct) {
    f.isBlocking = input.block;
    f.isCrouching = input.down && f.isGrounded;

    if (f.isGrounded) {
      // Basic Attack inputs
      if (input.heavyPunch) {
        startMove(f, f.config.moves.HEAVY_PUNCH, state);
      } else if (input.lightPunch) {
        startMove(f, f.config.moves.LIGHT_PUNCH, state);
      } else if (input.heavyKick) {
        startMove(f, f.config.moves.HEAVY_KICK, state);
      } else if (input.lightKick) {
        startMove(f, f.config.moves.LIGHT_KICK, state);
      } else if (input.up) {
        // Jump
        f.vy = f.config.stats.jumpForce * (speedMult < 1 ? 0.8 : 1.0);
        f.isGrounded = false;
        f.actionState = 'JUMPING';
        soundEngine.playJump();
      } else if (input.dashForward) {
        f.vx = f.config.stats.dashSpeed * f.facing * speedMult;
        f.actionState = 'DASH_FORWARD';
        soundEngine.playDash();
      } else if (input.dashBack) {
        f.vx = -f.config.stats.dashSpeed * f.facing * speedMult;
        f.actionState = 'DASH_BACK';
        soundEngine.playDash();
      } else if (input.right) {
        f.vx = f.config.stats.walkSpeed * speedMult;
        f.actionState = f.facing === 1 ? 'WALK_FORWARD' : 'WALK_BACK';
      } else if (input.left) {
        f.vx = -f.config.stats.walkSpeed * speedMult;
        f.actionState = f.facing === -1 ? 'WALK_FORWARD' : 'WALK_BACK';
      } else if (f.isCrouching) {
        f.vx *= 0.6;
        f.actionState = 'CROUCH';
      } else if (f.isBlocking) {
        f.vx *= 0.6;
        f.actionState = 'BLOCKING';
      } else {
        f.vx *= 0.65;
        f.actionState = 'IDLE';
      }
    } else {
      // In air control & Air Juggle attacks!
      if (input.right) f.vx += 0.004;
      if (input.left) f.vx -= 0.004;

      if (input.heavyPunch) {
        startMove(f, f.config.moves.HEAVY_PUNCH, state);
      }
    }
  }

  // Apply gravity: always applies whenever a fighter is above the ground, regardless of state
  if (f.y > 0 || !f.isGrounded) {
    f.vy -= GRAVITY;
    f.isGrounded = false;
  }

  // Apply friction/drag to horizontal velocity
  if (f.isGrounded) {
    if (f.actionState === 'HITSTUN' || f.actionState === 'BLOCKSTUN') {
      f.vx *= 0.85;
    } else if (f.actionState !== 'DASH_FORWARD' && f.actionState !== 'DASH_BACK' && f.actionState !== 'WALK_FORWARD' && f.actionState !== 'WALK_BACK') {
      f.vx *= 0.75;
    }
  } else {
    f.vx *= 0.98;
  }

  // Position updates
  f.x += f.vx;
  f.y += f.vy;

  // Floor collision (Y = 0): snap to ground level and clear vertical velocity
  if (f.y <= 0) {
    f.y = 0;
    f.vy = 0;
    f.isGrounded = true;
    if (f.actionState === 'JUMPING') {
      f.actionState = 'IDLE';
    }
    f.koTumble = 0;
  }

  // Stage boundaries
  if (f.x < -STAGE_BOUND_X) {
    f.x = -STAGE_BOUND_X;
    f.vx = 0;
  } else if (f.x > STAGE_BOUND_X) {
    f.x = STAGE_BOUND_X;
    f.vx = 0;
  }

  // Body pushbox collision between fighters (including sliding apart when landing from jumps)
  resolvePushboxCollision(f, opponent);

  // Max distance clamp (invisible boundary: max ~60% of ring width, keeps fighters engaged)
  const currentSep = Math.abs(f.x - opponent.x);
  if (currentSep > MAX_FIGHTER_DIST) {
    const excess = (currentSep - MAX_FIGHTER_DIST) * 0.5;
    if (f.x > opponent.x) {
      f.x -= excess;
      opponent.x += excess;
      if (f.vx > 0) f.vx = 0;
      if (opponent.vx < 0) opponent.vx = 0;
    } else {
      f.x += excess;
      opponent.x -= excess;
      if (f.vx < 0) f.vx = 0;
      if (opponent.vx > 0) opponent.vx = 0;
    }
  }
}

function startMove(f: FighterState, move: MoveDefinition, state?: GameState) {
  f.currentMove = move;
  f.moveFrame = 0;
  f.actionState = 'ATTACKING';
  f.hasHitThisMove = false;
  f.hasShownPopUpThisMove = false;
  f.lastHitboxIndex = undefined;

  // Level 2 Super: "DOOR-TO-DOOR SALES"
  if (state && (move.animType === 'door_to_door' || move.name === 'DOOR-TO-DOOR SALES')) {
    const opponent = f.playerIndex === 1 ? state.p2 : state.p1;
    startSuperTimeline(MATTHEW_LVL2_TIMELINE, state, f, opponent);
    return;
  }

  // Level 3 Ultimate: "THE SLEEPING GIANT"
  if (state && (move.animType === 'sleeping_giant' || move.name === 'THE SLEEPING GIANT (ULTIMATE)')) {
    const opponent = f.playerIndex === 1 ? state.p2 : state.p1;
    startSuperTimeline(MATTHEW_LVL3_TIMELINE, state, f, opponent);
    return;
  }

  if (move.isSuper) {
    const cost = move.superCost ?? 100;
    f.superMeter = Math.max(0, f.superMeter - cost);

    if (state) {
      state.superCinematicTicks = 60; // 1 second 40% overlay
      state.superTitleTicks = 60; // Title visible at top of screen for 1 second
      state.superTitle = move.name.replace(/\s*\(ULTIMATE\)$/i, '');
      state.superAttackerIndex = f.playerIndex;
      state.superType = cost >= 300 ? 'ultimate' : 'standard';
      state.slowMoTicks = cost >= 300 ? 30 : 20;
      state.slowMoFactor = cost >= 300 ? 0.20 : 0.25;
      state.screenShake = cost >= 300 ? 24 : 16;
      soundEngine.playSuperHit();

      // Subtle particle burst without duplicate floating text titles
      const particleColor = cost >= 300 ? 0xec4899 : cost >= 200 ? 0x38bdf8 : 0xfacc15;
      const particleShape = cost >= 300 ? 'heart' : 'star';
      spawnParticles(state, f.x, f.y + 1.4, 0, cost >= 300 ? 25 : 18, particleColor, particleShape);
    }
  } else {
    // Attack whoosh sound on non-super attacks
    soundEngine.playWhoosh(move.isHeavy ? 0.85 : 1.15);
  }
}

/**
 * Updates flying projectiles (e.g. duct tape roll)
 */
export function updateProjectiles(state: GameState) {
  if (!state.projectiles || state.projectiles.length === 0) return;

  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const proj = state.projectiles[i];
    proj.x += proj.vx;
    proj.y += proj.vy;
    proj.life--;

    // Spawn tiny tape dust particle
    if (Math.random() < 0.35) {
      spawnParticles(state, proj.x, proj.y, 0, 1, 0x94a3b8, 'spark');
    }

    const defender = proj.ownerIndex === 1 ? state.p2 : state.p1;
    const attacker = proj.ownerIndex === 1 ? state.p1 : state.p2;
    const hurtbox = getFighterHurtbox(defender);

    const hit = checkAABB(
      proj.x,
      proj.y,
      proj.radius * 2,
      proj.radius * 2,
      hurtbox.x,
      hurtbox.y,
      hurtbox.width,
      hurtbox.height
    );

    if (hit) {
      // 1. Door Shield reflection (Matthew holds up door shield)
      const isDoorShieldActive =
        defender.actionState === 'ATTACKING' &&
        (defender.currentMove?.animType === 'door_shield' || defender.currentMove?.name === 'Door Shield');

      if (isDoorShieldActive) {
        soundEngine.playBlock();
        proj.vx = -proj.vx * 1.25;
        proj.ownerIndex = defender.playerIndex;
        proj.life = Math.min(120, proj.life + 60);
        state.screenShake = 6;
        spawnFloatingText(state, 'REFLECTED! 🚪', proj.x, proj.y + 0.4, '#f59e0b');
        spawnParticles(state, proj.x, proj.y, 0, 15, 0xfacc15, 'shield', 0.35);
        continue;
      }

      // Check block
      const isFacingAttacker =
        (defender.x > proj.x && defender.facing === -1) ||
        (defender.x < proj.x && defender.facing === 1);
      const isBlocked = defender.isBlocking && isFacingAttacker && defender.actionState !== 'ATTACKING';

      if (isBlocked) {
        soundEngine.playBlock();
        const chip = Math.max(1, Math.round(proj.damage * 0.15 * 0.70));
        defender.health = Math.max(1, defender.health - chip);
        defender.blockstunFrames = 10;
        defender.actionState = 'BLOCKSTUN';
        spawnFloatingText(state, 'BLOCK!', proj.x, proj.y + 0.4, '#38bdf8');
        spawnParticles(state, proj.x, proj.y, 0, 8, 0x38bdf8, 'spark');
      } else {
        soundEngine.playLightHit();
        const dmg = Math.round(proj.damage * attacker.config.stats.powerMultiplier * 0.70);
        defender.health = Math.max(0, defender.health - dmg);
        defender.hitstunFrames = 22;
        defender.actionState = 'HITSTUN';
        defender.eyePop = 0.8;
        defender.wobbleAngle = -attacker.facing * 0.35;
        state.screenShake = 6;
        state.hitStopTicks = 5;

        if (proj.type === 'snore_zzz') {
          defender.vx = 0.45 * attacker.facing;
          spawnFloatingText(state, 'Zzz... SNORE WAVE!', defender.x, defender.y + 2.0, '#a855f7');
          spawnParticles(state, proj.x, proj.y, 0, 16, 0xa855f7, 'spark', 0.28);
        } else {
          defender.slowDebuffTicks = 120; // 2 seconds slowed!
          spawnFloatingText(state, 'DUCT TAPE!', proj.x, proj.y + 0.4, '#cbd5e1');
          spawnParticles(state, proj.x, proj.y, 0, 14, 0x94a3b8, 'spark');
        }
      }
      state.projectiles.splice(i, 1);
      continue;
    }

    // Stage boundary or expired
    if (Math.abs(proj.x) > STAGE_BOUND_X || proj.life <= 0) {
      state.projectiles.splice(i, 1);
    }
  }
}
