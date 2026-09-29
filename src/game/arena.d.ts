import * as THREE from 'three';
import { GameState } from '../types/game';

export declare class ArenaEnvironment {
  scene: THREE.Scene;
  group: THREE.Group;
  occludableMeshes: THREE.Mesh[];
  constructor(scene: THREE.Scene);
  update(timeMs: number, gameState?: GameState): void;
}
