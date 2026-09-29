import { GameState, InputFrame, InputSource } from '../../types/game';

export interface TouchInputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  lightPunch: boolean;
  heavyPunch: boolean;
  lightKick: boolean;
  heavyKick: boolean;
  superMove: boolean;
  super1?: boolean;
  super2?: boolean;
  super3?: boolean;
  block: boolean;
  throwBtn?: boolean;
}

export class TouchInputManager {
  private static instance: TouchInputManager;
  public state: TouchInputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    lightPunch: false,
    heavyPunch: false,
    lightKick: false,
    heavyKick: false,
    superMove: false,
    super1: false,
    super2: false,
    super3: false,
    block: false,
  };

  public static getInstance(): TouchInputManager {
    if (!TouchInputManager.instance) {
      TouchInputManager.instance = new TouchInputManager();
    }
    return TouchInputManager.instance;
  }

  public setButton(btn: keyof TouchInputState, active: boolean) {
    this.state[btn] = active;
  }

  public clearAll() {
    for (const key of Object.keys(this.state) as (keyof TouchInputState)[]) {
      this.state[key] = false;
    }
  }
}

export class KeyboardInput implements InputSource {
  private activeKeys = new Set<string>();
  private lastRightPressTime = 0;
  private lastLeftPressTime = 0;
  private dashForwardWindow = 0;
  private dashBackWindow = 0;
  private touchManager = TouchInputManager.getInstance();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown);
      window.addEventListener('keyup', this.handleKeyUp);
      window.addEventListener('blur', this.handleBlur);
    }
  }

  public destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('blur', this.handleBlur);
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // Prevent default scrolling for game keys
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)
    ) {
      e.preventDefault();
    }

    const now = performance.now();

    // Dash double-tap detection for arrows / keys
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      if (!this.activeKeys.has(e.code)) {
        if (now - this.lastRightPressTime < 280) {
          this.dashForwardWindow = 10;
        }
        this.lastRightPressTime = now;
      }
    }

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      if (!this.activeKeys.has(e.code)) {
        if (now - this.lastLeftPressTime < 280) {
          this.dashBackWindow = 10;
        }
        this.lastLeftPressTime = now;
      }
    }

    this.activeKeys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.activeKeys.delete(e.code);
  };

  private handleBlur = () => {
    this.activeKeys.clear();
    this.touchManager.clearAll();
  };

  public poll(state: GameState, playerIndex: 1 | 2): InputFrame {
    const p = playerIndex === 1 ? state.p1 : state.p2;
    const facingRight = p.facing === 1;
    const touch = this.touchManager.state;

    // Standard arrow controls (P1 primary)
    // Left/Right: ArrowLeft / ArrowRight
    // Up: ArrowUp
    // Down: ArrowDown
    // Attack buttons:
    // A: Light Punch, S: Heavy Punch, D: Light Kick, F: Heavy Kick
    // Also alternative arcade layout: J: LP, K: HP, L: LK, Semicolon: HK
    // Space: Super Move
    // B / Shift: Manual Block
    const k = (code: string) => this.activeKeys.has(code);

    const rawLeft = k('ArrowLeft') || touch.left;
    const rawRight = k('ArrowRight') || touch.right;
    const rawUp = k('ArrowUp') || k('KeyW') || touch.up;
    const rawDown = k('ArrowDown') || k('KeyS') && !k('ArrowLeft') && !k('ArrowRight') || touch.down;

    // In fighting games, holding back relative to facing = block / walk back
    const isBack = facingRight ? rawLeft : rawRight;
    const isForward = facingRight ? rawRight : rawLeft;

    const lp = k('KeyA') || k('KeyJ') || k('KeyU') || touch.lightPunch;
    const hp = k('KeyS') && !k('ArrowDown') || k('KeyK') || k('KeyI') || touch.heavyPunch;
    const lk = k('KeyD') && !k('ArrowRight') || k('KeyL') || k('KeyO') || touch.lightKick;
    const hk = k('KeyF') || k('Semicolon') || k('KeyP') || touch.heavyKick;
    const superMove = !!(k('Space') || k('KeyQ') || touch.superMove || touch.super1 || touch.super2 || touch.super3);
    const super1 = !!(touch.super1 || k('Digit1') || k('Numpad1'));
    const super2 = !!(touch.super2 || k('Digit2') || k('Numpad2'));
    const super3 = !!(touch.super3 || k('Digit3') || k('Numpad3'));
    const throwInput = lp && lk;
    const block = k('KeyB') || k('ShiftLeft') || k('ShiftRight') || touch.block || isBack;

    let dashFwd = false;
    let dashBck = false;

    if (this.dashForwardWindow > 0) {
      dashFwd = facingRight ? true : false;
      dashBck = facingRight ? false : true;
      this.dashForwardWindow--;
    } else if (this.dashBackWindow > 0) {
      dashBck = facingRight ? true : false;
      dashFwd = facingRight ? false : true;
      this.dashBackWindow--;
    }

    return {
      left: rawLeft,
      right: rawRight,
      up: rawUp,
      down: rawDown,
      lightPunch: lp,
      heavyPunch: hp,
      lightKick: lk,
      heavyKick: hk,
      superMove,
      super1,
      super2,
      super3,
      throw: throwInput,
      block,
      dashForward: dashFwd,
      dashBack: dashBck,
    };
  }

  public reset() {
    this.activeKeys.clear();
    this.dashForwardWindow = 0;
    this.dashBackWindow = 0;
    this.touchManager.clearAll();
  }
}

export type AIDifficulty = 'EASY' | 'NORMAL' | 'HARD';
export type AIState = 'APPROACH' | 'ATTACK' | 'RETREAT' | 'IDLE' | 'BLOCK' | 'JUMP_IN';

export class AIInput implements InputSource {
  public difficulty: AIDifficulty = 'NORMAL';

  // 1. Decision Interval: new decision only every 0.4-0.7 sec (24-42 ticks)
  private decisionTimer: number = 24;
  private currentState: AIState = 'APPROACH';

  // 2. Attack Intervals and Selection
  private attackIntervalTimer: number = 0;
  private attackChoice: 'LP' | 'HP' | 'LK' | 'HK' | 'SPECIAL' | 'SUPER' = 'LP';

  // 3. Post-Attack Pause: 0.6-1.0 sec (36-60 ticks)
  private postAttackPauseTimer: number = 0;
  private wasAttackingLastFrame: boolean = false;

  // 4. Combo tracking: Max combo length per difficulty
  private currentComboHits: number = 0;
  private comboButtonPending: 'LP' | 'HP' | 'LK' | 'HK' | 'SUPER' | null = null;
  private hasCountedCurrentMoveHit: boolean = false;

  // 5. Super Cooldown: minimum 15 sec (900 ticks)
  private superCooldownTimer: number = 0;

  // 6. Reaction Delay & Blocking
  private reactionDelayTimer: number = 0;
  private hasScheduledReaction: boolean = false;
  private willBlockReaction: boolean = false;
  private isBlockingReaction: boolean = false;
  private blockDurationTimer: number = 0;

  // 7. Player attack tracking for whiff punishment
  private playerWasAttacking: boolean = false;

  constructor(difficulty: AIDifficulty = 'NORMAL') {
    this.difficulty = difficulty;
  }

  public reset() {
    this.currentState = 'APPROACH';
    this.decisionTimer = 24 + Math.floor(Math.random() * 18);
    this.attackIntervalTimer = 40;
    this.postAttackPauseTimer = 0;
    this.wasAttackingLastFrame = false;
    this.currentComboHits = 0;
    this.comboButtonPending = null;
    this.hasCountedCurrentMoveHit = false;
    this.superCooldownTimer = 0;
    this.reactionDelayTimer = 0;
    this.hasScheduledReaction = false;
    this.willBlockReaction = false;
    this.isBlockingReaction = false;
    this.blockDurationTimer = 0;
    this.playerWasAttacking = false;
  }

  private getDifficultyConfig() {
    switch (this.difficulty) {
      case 'EASY':
        return {
          reactionDelayTicks: 30, // 500ms
          blockChance: 0.10, // Blocks 10% of attacks
          attackIntervalMin: 120, // 2.0s
          attackIntervalMax: 180, // 3.0s
          maxComboHits: 2, // Max combo: 2 hits
          allowSpecials: false,
          allowSupers: false,
          maxSuperLevel: 0,
          punishChance: 0.0, // 0% punish
        };
      case 'NORMAL':
        return {
          reactionDelayTicks: 21, // 350ms
          blockChance: 0.25, // Blocks 25% of attacks
          attackIntervalMin: 90, // 1.5s
          attackIntervalMax: 120, // 2.0s
          maxComboHits: 3, // Max combo: 3 hits
          allowSpecials: true,
          allowSupers: true,
          maxSuperLevel: 1, // Only level 1 supers
          punishChance: 0.30, // Punishes player's missed attacks 30% of the time
        };
      case 'HARD':
      default:
        return {
          reactionDelayTicks: 12, // 200ms
          blockChance: 0.45, // Blocks 45% of attacks
          attackIntervalMin: 60, // 1.0s
          attackIntervalMax: 90, // 1.5s
          maxComboHits: 5, // Max combo: 5 hits
          allowSpecials: true,
          allowSupers: true,
          maxSuperLevel: 3, // All supers (lvl 1, 2, 3)
          punishChance: 0.60, // Punishes missed attacks 60% of the time
        };
    }
  }

  private pickNewDecision(dist: number) {
    const cfg = this.getDifficultyConfig();
    // Reset decision timer: 0.4 - 0.7 sec (24 - 42 ticks)
    this.decisionTimer = 24 + Math.floor(Math.random() * 19);

    // If currently in post-attack pause (0.6-1.0s), CPU pauses (retreats, idles, or blocks)
    if (this.postAttackPauseTimer > 0) {
      const pauseRand = Math.random();
      if (pauseRand < 0.45) this.currentState = 'RETREAT';
      else if (pauseRand < 0.80) this.currentState = 'IDLE';
      else this.currentState = 'BLOCK';
      return;
    }

    // Normal tactical decisions
    if (dist > 2.4) {
      // Far range: approach
      const r = Math.random();
      if (r < 0.75) this.currentState = 'APPROACH';
      else if (r < 0.90) this.currentState = 'JUMP_IN';
      else this.currentState = 'IDLE';
    } else if (dist <= 2.4 && dist >= 1.35) {
      // Mid range
      if (this.attackIntervalTimer <= 0) {
        this.currentState = 'ATTACK';
        this.prepareAttackChoice(cfg);
      } else {
        const r = Math.random();
        if (r < 0.45) this.currentState = 'APPROACH';
        else if (r < 0.75) this.currentState = 'RETREAT';
        else this.currentState = 'IDLE';
      }
    } else {
      // Melee range (< 1.35)
      if (this.attackIntervalTimer <= 0) {
        this.currentState = 'ATTACK';
        this.prepareAttackChoice(cfg);
      } else {
        const r = Math.random();
        if (r < 0.50) this.currentState = 'RETREAT';
        else if (r < 0.80) this.currentState = 'BLOCK';
        else this.currentState = 'IDLE';
      }
    }
  }

  private prepareAttackChoice(cfg: ReturnType<typeof this.getDifficultyConfig>) {
    // Schedule next attack interval
    this.attackIntervalTimer =
      cfg.attackIntervalMin + Math.floor(Math.random() * (cfg.attackIntervalMax - cfg.attackIntervalMin + 1));

    const r = Math.random();
    if (cfg.allowSupers && this.superCooldownTimer <= 0 && r < 0.20) {
      this.attackChoice = 'SUPER';
    } else if (cfg.allowSpecials && r < 0.40) {
      this.attackChoice = 'SPECIAL';
    } else if (r < 0.65) {
      this.attackChoice = 'LP';
    } else if (r < 0.80) {
      this.attackChoice = 'LK';
    } else if (r < 0.92) {
      this.attackChoice = 'HP';
    } else {
      this.attackChoice = 'HK';
    }
  }

  public poll(state: GameState, playerIndex: 1 | 2): InputFrame {
    const ai = playerIndex === 1 ? state.p1 : state.p2;
    const opponent = playerIndex === 1 ? state.p2 : state.p1;

    const frame: InputFrame = {
      left: false,
      right: false,
      up: false,
      down: false,
      lightPunch: false,
      heavyPunch: false,
      lightKick: false,
      heavyKick: false,
      superMove: false,
      block: false,
      dashForward: false,
      dashBack: false,
    };

    if (state.stagePhase !== 'FIGHTING') {
      return frame;
    }

    const cfg = this.getDifficultyConfig();
    const dist = Math.abs(opponent.x - ai.x);
    const opponentIsRight = opponent.x > ai.x;
    const aiFacingRight = ai.facing === 1;

    // Timers update
    if (this.attackIntervalTimer > 0) this.attackIntervalTimer--;
    if (this.postAttackPauseTimer > 0) this.postAttackPauseTimer--;
    if (this.superCooldownTimer > 0) this.superCooldownTimer--;

    // 1. Track end of CPU attack or combo to trigger Post-Attack Pause (0.6 - 1.0 sec)
    const isAttackingNow = ai.actionState === 'ATTACKING';
    if (this.wasAttackingLastFrame && !isAttackingNow) {
      // Attack or combo finished: pause for 0.6-1.0 sec (36-60 ticks)
      this.postAttackPauseTimer = 36 + Math.floor(Math.random() * 25);
      this.currentComboHits = 0;
      this.comboButtonPending = null;
      this.hasCountedCurrentMoveHit = false;

      // Choose pause behavior: walk back, idle, or block
      const pRand = Math.random();
      if (pRand < 0.45) this.currentState = 'RETREAT';
      else if (pRand < 0.80) this.currentState = 'IDLE';
      else this.currentState = 'BLOCK';
    }
    this.wasAttackingLastFrame = isAttackingNow;

    // 2. Combo hit counting & follow-up chaining
    if (isAttackingNow) {
      if (ai.hasHitThisMove && !this.hasCountedCurrentMoveHit) {
        this.hasCountedCurrentMoveHit = true;
        this.currentComboHits++;

        // If under max combo limit, try to chain into next combo move
        if (this.currentComboHits < cfg.maxComboHits && ai.config.combos && ai.config.combos.length > 0) {
          const matchingCombo = ai.config.combos.find((c) => c.fromMoveName === ai.currentMove?.name);
          if (matchingCombo) {
            this.comboButtonPending = matchingCombo.nextButton;
          }
        } else {
          // Max combo reached: combo always ends
          this.comboButtonPending = null;
        }
      }
    } else {
      this.hasCountedCurrentMoveHit = false;
    }

    // 3. Human Reaction Delay & Blocking (0.5s EASY, 0.35s NORMAL, 0.20s HARD)
    const playerIsAttacking = opponent.actionState === 'ATTACKING';
    if (playerIsAttacking) {
      if (!this.hasScheduledReaction) {
        this.hasScheduledReaction = true;
        this.reactionDelayTimer = cfg.reactionDelayTicks;
        this.willBlockReaction = Math.random() < cfg.blockChance;
      }
    } else {
      this.hasScheduledReaction = false;
      this.isBlockingReaction = false;
      this.blockDurationTimer = 0;
    }

    if (this.reactionDelayTimer > 0) {
      this.reactionDelayTimer--;
      if (this.reactionDelayTimer === 0 && this.willBlockReaction && playerIsAttacking && dist < 2.6) {
        this.isBlockingReaction = true;
        this.blockDurationTimer = 16 + Math.floor(Math.random() * 8); // brief block
      }
    }

    if (this.isBlockingReaction && this.blockDurationTimer > 0) {
      this.blockDurationTimer--;
      if (this.blockDurationTimer <= 0 || !playerIsAttacking) {
        this.isBlockingReaction = false;
      }
    }

    // 4. Punish Player's Missed Attacks (0% EASY, 30% NORMAL, 60% HARD)
    if (this.playerWasAttacking && !playerIsAttacking) {
      // Player just finished an attack: check if it missed (did not put CPU in hitstun/blockstun)
      if (ai.actionState !== 'HITSTUN' && ai.actionState !== 'BLOCKSTUN' && this.postAttackPauseTimer <= 0) {
        if (Math.random() < cfg.punishChance) {
          // Punish opening!
          this.currentState = 'ATTACK';
          this.attackIntervalTimer = 0;
          this.prepareAttackChoice(cfg);
        }
      }
    }
    this.playerWasAttacking = playerIsAttacking;

    // 5. Decision Timer: makes a new decision only every 0.4-0.7 sec (24-42 ticks)
    this.decisionTimer--;
    if (this.decisionTimer <= 0) {
      this.pickNewDecision(dist);
    }

    // 6. If currently reacting with block, override to block
    if (this.isBlockingReaction) {
      frame.block = true;
      if (aiFacingRight) frame.left = true;
      else frame.right = true;
      return frame;
    }

    // 7. If combo follow-up is pending during attack recovery, press the combo button
    if (isAttackingNow && this.comboButtonPending) {
      if (this.comboButtonPending === 'LP') frame.lightPunch = true;
      else if (this.comboButtonPending === 'HP') frame.heavyPunch = true;
      else if (this.comboButtonPending === 'LK') frame.lightKick = true;
      else if (this.comboButtonPending === 'HK') frame.heavyKick = true;
      else if (this.comboButtonPending === 'SUPER') frame.superMove = true;
      this.comboButtonPending = null;
      return frame;
    }

    // 8. Execute actions based on currentState
    switch (this.currentState) {
      case 'APPROACH':
        if (opponentIsRight) frame.right = true;
        else frame.left = true;
        if (dist > 2.2) {
          frame.dashForward = true;
        }
        break;

      case 'RETREAT':
        if (opponentIsRight) frame.left = true;
        else frame.right = true;
        break;

      case 'IDLE':
        // Do nothing (stand / pause)
        break;

      case 'BLOCK':
        frame.block = true;
        if (aiFacingRight) frame.left = true;
        else frame.right = true;
        break;

      case 'JUMP_IN':
        if (ai.isGrounded) {
          frame.up = true;
          if (opponentIsRight) frame.right = true;
          else frame.left = true;
        }
        break;

      case 'ATTACK':
        // Move into strike range
        if (dist > 1.35) {
          if (opponentIsRight) frame.right = true;
          else frame.left = true;
          if (dist > 2.0) frame.dashForward = true;
        }

        // Only strike when in range and not in post-attack pause
        if (dist <= 1.65 && this.postAttackPauseTimer <= 0 && !isAttackingNow) {
          if (this.attackChoice === 'SUPER' && cfg.allowSupers && this.superCooldownTimer <= 0) {
            if (cfg.maxSuperLevel >= 3 && ai.superMeter >= 300) {
              frame.super3 = true;
              frame.superMove = true;
              this.superCooldownTimer = 900; // 15 sec cooldown
            } else if (cfg.maxSuperLevel >= 2 && ai.superMeter >= 200) {
              frame.super2 = true;
              frame.superMove = true;
              this.superCooldownTimer = 900; // 15 sec cooldown
            } else if (cfg.maxSuperLevel >= 1 && ai.superMeter >= 100) {
              frame.super1 = true;
              frame.superMove = true;
              this.superCooldownTimer = 900; // 15 sec cooldown
            } else {
              frame.lightPunch = true;
            }
          } else if (this.attackChoice === 'SPECIAL' && cfg.allowSpecials) {
            // Trigger special by pressing directional forward + punch/kick
            if (opponentIsRight) frame.right = true;
            else frame.left = true;
            frame.heavyPunch = true;
          } else if (this.attackChoice === 'LP') {
            frame.lightPunch = true;
          } else if (this.attackChoice === 'HP') {
            frame.heavyPunch = true;
          } else if (this.attackChoice === 'LK') {
            frame.lightKick = true;
          } else if (this.attackChoice === 'HK') {
            frame.heavyKick = true;
          } else {
            frame.lightPunch = true;
          }
        }
        break;

      default:
        break;
    }

    return frame;
  }
}

/**
 * NetworkInput placeholder demonstrating interface separation for future online play.
 */
export class NetworkInput implements InputSource {
  private lastReceivedFrame: InputFrame = {
    left: false,
    right: false,
    up: false,
    down: false,
    lightPunch: false,
    heavyPunch: false,
    lightKick: false,
    heavyKick: false,
    superMove: false,
    block: false,
    dashForward: false,
    dashBack: false,
  };

  public receiveFrame(frame: InputFrame) {
    this.lastReceivedFrame = { ...frame };
  }

  public poll(): InputFrame {
    return this.lastReceivedFrame;
  }
}
