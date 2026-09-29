import { AttackButton, InputFrame, MotionCommand } from '../../types/game';

export interface BufferedInputEntry {
  timestamp: number;
  frame: InputFrame;
  forward: boolean;
  back: boolean;
  up: boolean;
  down: boolean;
  dir: 'NEUTRAL' | 'F' | 'B' | 'D' | 'U' | 'DF' | 'DB' | 'UF' | 'UB';
  pressedLP: boolean;
  pressedHP: boolean;
  pressedLK: boolean;
  pressedHK: boolean;
  pressedSuper: boolean;
  pressedSuper1: boolean;
  pressedSuper2: boolean;
  pressedSuper3: boolean;
}

export interface DetectedCommand {
  command: MotionCommand;
  button: AttackButton;
  timestamp: number;
}

export class InputBuffer {
  public static readonly BUFFER_SIZE = 16;
  public static readonly MOTION_WINDOW_MS = 400; // 400ms window for motion inputs

  private buffer: BufferedInputEntry[] = [];
  private lastLPTime: number = 0;
  private lastLKTime: number = 0;
  private prevFrame: InputFrame = {
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

  public record(frame: InputFrame, facing: 1 | -1, now: number = performance.now()): BufferedInputEntry {
    const forward = facing === 1 ? frame.right : frame.left;
    const back = facing === 1 ? frame.left : frame.right;
    const up = frame.up;
    const down = frame.down;

    let dir: BufferedInputEntry['dir'] = 'NEUTRAL';
    if (down && forward) dir = 'DF';
    else if (down && back) dir = 'DB';
    else if (up && forward) dir = 'UF';
    else if (up && back) dir = 'UB';
    else if (down) dir = 'D';
    else if (up) dir = 'U';
    else if (forward) dir = 'F';
    else if (back) dir = 'B';

    // Edge triggers: true only on first tick pressed down
    const pressedLP = frame.lightPunch && !this.prevFrame.lightPunch;
    const pressedHP = frame.heavyPunch && !this.prevFrame.heavyPunch;
    const pressedLK = frame.lightKick && !this.prevFrame.lightKick;
    const pressedHK = frame.heavyKick && !this.prevFrame.heavyKick;
    const pressedSuper = frame.superMove && !this.prevFrame.superMove;
    const pressedSuper1 = !!(frame.super1 && !this.prevFrame.super1);
    const pressedSuper2 = !!(frame.super2 && !this.prevFrame.super2);
    const pressedSuper3 = !!(frame.super3 && !this.prevFrame.super3);

    if (pressedLP) {
      this.lastLPTime = now;
    }
    if (pressedLK) {
      this.lastLKTime = now;
    }

    const entry: BufferedInputEntry = {
      timestamp: now,
      frame: { ...frame },
      forward,
      back,
      up,
      down,
      dir,
      pressedLP,
      pressedHP,
      pressedLK,
      pressedHK,
      pressedSuper,
      pressedSuper1,
      pressedSuper2,
      pressedSuper3,
    };

    this.buffer.push(entry);
    if (this.buffer.length > InputBuffer.BUFFER_SIZE) {
      this.buffer.shift();
    }

    this.prevFrame = { ...frame };
    return entry;
  }

  public getRecentEntries(withinMs: number = InputBuffer.MOTION_WINDOW_MS, now: number = performance.now()): BufferedInputEntry[] {
    return this.buffer.filter((e) => now - e.timestamp <= withinMs);
  }

  public checkMotionCommand(
    buttonPressed: AttackButton,
    now: number = performance.now()
  ): MotionCommand | null {
    const recent = this.getRecentEntries(InputBuffer.MOTION_WINDOW_MS, now);
    if (recent.length < 3) return null;

    // Check commands from highest priority to lowest priority:
    // 1. Down-Back-Forward (↓ ← → + button)
    if (this.matchDownBackForward(recent)) {
      return 'DOWN_BACK_FORWARD';
    }

    // 2. Double Down (↓ ↓ + button)
    if (this.matchDownDown(recent)) {
      return 'DOWN_DOWN';
    }

    // 3. Quarter Circle Forward (↓ → + button)
    if (this.matchQCF(recent)) {
      return 'QCF';
    }

    // 4. Quarter Circle Back (↓ ← + button)
    if (this.matchQCB(recent)) {
      return 'QCB';
    }

    // 5. Back-Forward (← → + button)
    if (this.matchBackForward(recent)) {
      return 'BACK_FORWARD';
    }

    // 6. Double Tap Forward (→ → + button)
    if (this.matchDoubleTapForward(recent)) {
      return 'DOUBLE_TAP_F';
    }

    return null;
  }

  /**
   * Matches QCB (↓ ← + button):
   * An entry with Down (D or DB), followed later by an entry with Back (B or DB).
   */
  private matchQCB(entries: BufferedInputEntry[]): boolean {
    const lastEntry = entries[entries.length - 1];
    // Last entry should have back direction or back pressed
    if (!lastEntry.back && lastEntry.dir !== 'B' && lastEntry.dir !== 'DB') {
      return false;
    }

    let foundDown = false;
    let foundDownIndex = -1;

    for (let i = 0; i < entries.length - 1; i++) {
      const e = entries[i];
      if (e.dir === 'D' || e.dir === 'DB' || (e.down && !e.forward)) {
        foundDown = true;
        foundDownIndex = i;
        break;
      }
    }

    if (!foundDown) return false;

    // Ensure back was achieved after down
    for (let i = foundDownIndex + 1; i < entries.length; i++) {
      const e = entries[i];
      if (e.back || e.dir === 'B' || e.dir === 'DB') {
        return true;
      }
    }

    return false;
  }

  /**
   * Matches Down-Back-Forward (↓ ← → + button)
   */
  private matchDownBackForward(entries: BufferedInputEntry[]): boolean {
    const lastEntry = entries[entries.length - 1];
    if (!lastEntry.forward && lastEntry.dir !== 'F' && lastEntry.dir !== 'DF') {
      return false;
    }

    let foundDown = false;
    let foundDownIndex = -1;
    for (let i = 0; i < entries.length - 1; i++) {
      const e = entries[i];
      if (e.down || e.dir === 'D' || e.dir === 'DB' || e.dir === 'DF') {
        foundDown = true;
        foundDownIndex = i;
        break;
      }
    }
    if (!foundDown) return false;

    let foundBack = false;
    let foundBackIndex = -1;
    for (let i = foundDownIndex; i < entries.length - 1; i++) {
      const e = entries[i];
      if (e.back || e.dir === 'B' || e.dir === 'DB') {
        foundBack = true;
        foundBackIndex = i;
        break;
      }
    }
    if (!foundBack) return false;

    for (let i = foundBackIndex + 1; i < entries.length; i++) {
      const e = entries[i];
      if (e.forward || e.dir === 'F' || e.dir === 'DF') {
        return true;
      }
    }
    return false;
  }

  /**
   * Matches QCF (↓ → + button):
   * An entry with Down (D or DF), followed later by an entry with Forward (F or DF).
   */
  private matchQCF(entries: BufferedInputEntry[]): boolean {
    const lastEntry = entries[entries.length - 1];
    // Last entry should have forward direction or forward pressed
    if (!lastEntry.forward && lastEntry.dir !== 'F' && lastEntry.dir !== 'DF') {
      return false;
    }

    let foundDown = false;
    let foundDownIndex = -1;

    for (let i = 0; i < entries.length - 1; i++) {
      const e = entries[i];
      if (e.dir === 'D' || e.dir === 'DF' || (e.down && !e.back)) {
        foundDown = true;
        foundDownIndex = i;
        break;
      }
    }

    if (!foundDown) return false;

    // Ensure forward was achieved after down
    for (let i = foundDownIndex + 1; i < entries.length; i++) {
      const e = entries[i];
      if (e.forward || e.dir === 'F' || e.dir === 'DF') {
        return true;
      }
    }

    return false;
  }

  /**
   * Matches Double Down (↓ ↓ + button):
   * Down -> Not Down -> Down + button
   */
  private matchDownDown(entries: BufferedInputEntry[]): boolean {
    const lastEntry = entries[entries.length - 1];
    if (!lastEntry.down && lastEntry.dir !== 'D' && lastEntry.dir !== 'DF' && lastEntry.dir !== 'DB') {
      return false;
    }

    let phase = 0; // 0 = looking for initial Down, 1 = looking for released Down, 2 = confirmed
    for (let i = 0; i < entries.length - 1; i++) {
      const e = entries[i];
      if (phase === 0) {
        if (e.down || e.dir === 'D') {
          phase = 1;
        }
      } else if (phase === 1) {
        if (!e.down && e.dir !== 'D' && e.dir !== 'DF' && e.dir !== 'DB') {
          return true; // We released down before the final down!
        }
      }
    }

    return false;
  }

  /**
   * Matches Back-Forward (← → + button):
   * Back (B or DB) -> Forward (F or DF) + button
   */
  private matchBackForward(entries: BufferedInputEntry[]): boolean {
    const lastEntry = entries[entries.length - 1];
    if (!lastEntry.forward && lastEntry.dir !== 'F' && lastEntry.dir !== 'DF') {
      return false;
    }

    let foundBack = false;
    for (let i = 0; i < entries.length - 1; i++) {
      const e = entries[i];
      if (e.back || e.dir === 'B' || e.dir === 'DB') {
        foundBack = true;
        break;
      }
    }

    return foundBack;
  }

  /**
   * Matches Double Tap Forward (→ → + button):
   * Forward -> Not Forward -> Forward + button
   */
  private matchDoubleTapForward(entries: BufferedInputEntry[]): boolean {
    const lastEntry = entries[entries.length - 1];
    if (!lastEntry.forward && lastEntry.dir !== 'F') {
      return false;
    }

    let phase = 0; // 0 = looking for initial Forward, 1 = released Forward
    for (let i = 0; i < entries.length - 1; i++) {
      const e = entries[i];
      if (phase === 0) {
        if (e.forward || e.dir === 'F') {
          phase = 1;
        }
      } else if (phase === 1) {
        if (!e.forward && e.dir !== 'F' && e.dir !== 'DF') {
          return true; // Released forward before re-pressing forward
        }
      }
    }

    return false;
  }

  /**
   * Checks if LP and LK were pressed simultaneously (within 100ms of each other),
   * or if both LP and LK are currently held down together.
   */
  public isThrowAttempt(now: number = performance.now()): boolean {
    // Both buttons currently held down
    if (this.prevFrame.lightPunch && this.prevFrame.lightKick) {
      return true;
    }
    // Both pressed within 100ms of each other
    if (this.lastLPTime > 0 && this.lastLKTime > 0) {
      const diff = Math.abs(this.lastLPTime - this.lastLKTime);
      const mostRecent = Math.max(this.lastLPTime, this.lastLKTime);
      if (diff <= 100 && (now - mostRecent) <= 120) {
        return true;
      }
    }
    return false;
  }

  public consumeThrow(): void {
    this.lastLPTime = 0;
    this.lastLKTime = 0;
  }

  public clear(): void {
    this.buffer = [];
    this.lastLPTime = 0;
    this.lastLKTime = 0;
  }
}
