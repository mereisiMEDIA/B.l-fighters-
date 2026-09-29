import * as THREE from 'three';
import { FighterConfig } from '../types/game';
import { GameRenderer } from '../game/renderer';

const portraitCache = new Map<string, string>();

let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedCanvas: HTMLCanvasElement | null = null;

function getSharedRenderer(): { renderer: THREE.WebGLRenderer; canvas: HTMLCanvasElement } {
  if (!sharedRenderer || !sharedCanvas) {
    sharedCanvas = document.createElement('canvas');
    sharedCanvas.width = 160;
    sharedCanvas.height = 160;
    sharedRenderer = new THREE.WebGLRenderer({
      canvas: sharedCanvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    sharedRenderer.setSize(160, 160);
    sharedRenderer.setPixelRatio(1);
    sharedRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    sharedRenderer.toneMappingExposure = 1.35;
  }
  return { renderer: sharedRenderer, canvas: sharedCanvas };
}

/**
 * Returns cached portrait data URL if already rendered
 */
export function getCachedPortrait(fighterId: string): string | undefined {
  return portraitCache.get(fighterId);
}

/**
 * Renders once from the 3D model (head and shoulders, front view) and caches the image data URL
 */
export function renderFighterPortrait(fighter: FighterConfig, renderer: GameRenderer): string {
  if (portraitCache.has(fighter.id)) {
    return portraitCache.get(fighter.id)!;
  }

  const { renderer: previewRenderer, canvas } = getSharedRenderer();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 10);

  // Studio lighting focused on head and shoulders
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e1b4b, 1.8);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffeedd, 2.4);
  keyLight.position.set(1.5, 2.5, 2.0);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.2);
  fillLight.position.set(-1.5, 1.5, 2.0);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xfacc15, 1.2);
  rimLight.position.set(0, 3.0, -1.8);
  scene.add(rimLight);

  // Build character rig
  const rig = renderer.buildHierarchicalCharacterRig(fighter);
  const model = rig.root;
  model.position.set(0, 0, 0);
  model.rotation.y = 0; // Front view
  scene.add(model);

  model.updateMatrixWorld(true);

  // Find head world position
  const headPos = new THREE.Vector3();
  rig.head.getWorldPosition(headPos);

  const headBox = new THREE.Box3().setFromObject(rig.head);
  const headSize = new THREE.Vector3();
  headBox.getSize(headSize);

  // Center camera slightly below head center to capture head, neck, and shoulders
  const targetY = headPos.y - 0.05;
  const targetZ = headPos.z;

  // Distance to fit head + shoulders nicely with margin
  const framingHeight = Math.max(headSize.y * 1.5, 0.85);
  const fovHalfRad = THREE.MathUtils.degToRad(camera.fov / 2);
  const dist = (framingHeight / 2) / Math.tan(fovHalfRad);

  camera.position.set(0, targetY, targetZ + dist);
  camera.lookAt(0, targetY, targetZ);

  previewRenderer.render(scene, camera);
  const dataUrl = canvas.toDataURL('image/png');

  portraitCache.set(fighter.id, dataUrl);

  // Clean up scene objects
  scene.remove(model);

  return dataUrl;
}
