import * as THREE from 'three';
import { GameState, FighterState } from '../types/game';

export declare const COLOR_BLOOD: number;
export declare const COLOR_SWEAT: number;
export declare const COLOR_TEAR: number;
export declare const COLOR_TOOTH: number;
export declare const COLOR_STAR: number;
export declare const COLOR_BREATH: number;
export declare const COLOR_SPARK: number;

export declare const MAX_PARTICLES: number;
export declare const MAX_SPLATS: number;
export declare const SPLAT_DURATION: number;

export declare function drawFaceDamageCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  level: number
): void;

export declare function createDazedStarsGroup(): THREE.Group;

export declare class VisualEffectsSystem {
  scene: THREE.Scene;
  particleInstanced: THREE.InstancedMesh;
  splatInstanced: THREE.InstancedMesh;
  constructor(scene: THREE.Scene);
  spawnParticles(
    x: number,
    y: number,
    z: number,
    count: number,
    color: number,
    shape: 'star' | 'sweat' | 'spark' | 'heart' | 'shield' | 'blood' | 'tear' | 'breath' | 'tooth',
    baseSize?: number,
    customVel?: { vx?: number; vy?: number; vz?: number } | null
  ): void;
  addMatSplat(x: number, z: number, scale?: number): void;
  onHit(hitEvent: {
    attacker?: FighterState;
    defender?: FighterState;
    hbX: number;
    hbY: number;
    isHeavy: boolean;
    isSuper: boolean;
    damage?: number;
  }): void;
  updateFighter(fighter: FighterState, rig: any, state?: GameState): void;
  update(dt: number, state?: GameState, p1Rig?: any, p2Rig?: any): void;
  reset(p1Rig?: any, p2Rig?: any): void;
  triggerTestFx(
    centerX?: number,
    centerY?: number,
    state?: GameState | null,
    p1?: FighterState | null,
    p2?: FighterState | null
  ): void;
}

export declare function triggerHitEffects(
  state: GameState,
  attacker: FighterState,
  defender: FighterState,
  activeHitbox: any,
  hbX: number,
  hbY: number,
  isHeavy: boolean,
  isSuper: boolean
): void;
