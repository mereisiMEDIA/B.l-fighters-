import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FighterConfig } from '../types/game';
import { GameRenderer } from '../game/renderer';

interface Fighter3DPreviewProps {
  fighter: FighterConfig;
  renderer: GameRenderer | null;
}

export const Fighter3DPreview: React.FC<Fighter3DPreviewProps> = ({ fighter, renderer }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !renderer) return;

    const width = container.clientWidth || 240;
    const height = container.clientHeight || 200;

    // 1. Scene & Perspective Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50);

    // 2. WebGL Renderer
    const previewRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    previewRenderer.setSize(width, height);
    previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    previewRenderer.toneMappingExposure = 1.35;
    container.innerHTML = '';
    container.appendChild(previewRenderer.domElement);

    // 3. Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e1b4b, 1.8);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    keyLight.position.set(2.5, 4.0, 3.0);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.0);
    fillLight.position.set(-2.5, 2.0, 2.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.4);
    rimLight.position.set(-2.5, 2.5, -2.0);
    scene.add(rimLight);

    const bottomGlow = new THREE.PointLight(0xf59e0b, 1.2, 5);
    bottomGlow.position.set(0, -0.1, 0.5);
    scene.add(bottomGlow);

    // 4. Pedestal under character
    const pedestalGroup = new THREE.Group();
    const pedestalGeo = new THREE.CylinderGeometry(0.75, 0.85, 0.08, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.6,
    });
    const pedestalMesh = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestalMesh.position.y = -0.04;
    pedestalGroup.add(pedestalMesh);

    // Glowing ring on pedestal
    const ringGeo = new THREE.RingGeometry(0.68, 0.74, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.002;
    pedestalGroup.add(ringMesh);

    scene.add(pedestalGroup);

    // 5. Build 3D Fighter Character Rig
    const rig = renderer.buildHierarchicalCharacterRig(fighter);
    const modelGroup = rig.root;
    modelGroup.position.set(0, 0, 0);
    // Fighter faces the camera (front view)
    modelGroup.rotation.y = 0;
    scene.add(modelGroup);

    // 6. Compute fighter bounding box (THREE.Box3) and fit camera automatically
    modelGroup.updateMatrixWorld(true);
    const bbox = new THREE.Box3().setFromObject(modelGroup);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // Set camera distance so full body (top of head to feet) fits inside preview with 10% margin on top and bottom
    // Total vertical view = size.y / (1 - 0.20) = size.y / 0.80
    const targetHeight = size.y / 0.80;
    const fovHalfRad = THREE.MathUtils.degToRad(camera.fov / 2);
    let cameraDistance = (targetHeight / 2) / Math.tan(fovHalfRad);

    // Also ensure width fits with at least 10% horizontal margin
    const targetWidth = size.x / 0.80;
    const horizDistance = (targetWidth / 2) / (Math.tan(fovHalfRad) * camera.aspect);
    cameraDistance = Math.max(cameraDistance, horizDistance);

    camera.position.set(center.x, center.y, center.z + cameraDistance);
    camera.lookAt(center.x, center.y, center.z);

    // 7. Animation loop: Fighter faces camera (front view) with subtle idle breathing
    let animId: number;
    const animate = () => {
      const t = performance.now() * 0.0025;
      // Gentle breathing idle while strictly maintaining front-view
      modelGroup.rotation.y = 0;
      if (rig.spine) {
        rig.spine.position.y = Math.sin(t) * 0.012;
      }
      previewRenderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animId = requestAnimationFrame(animate);

    // 8. Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      const hDist = (targetWidth / 2) / (Math.tan(fovHalfRad) * camera.aspect);
      const finalDist = Math.max(cameraDistance, hDist);
      camera.position.set(center.x, center.y, center.z + finalDist);
      camera.updateProjectionMatrix();
      previewRenderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      scene.remove(modelGroup);
      scene.remove(pedestalGroup);
      pedestalGeo.dispose();
      pedestalMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      previewRenderer.dispose();
      if (container.contains(previewRenderer.domElement)) {
        container.removeChild(previewRenderer.domElement);
      }
    };
  }, [fighter, renderer]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <div ref={containerRef} className="w-full h-full flex items-center justify-center" />
      {!renderer && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-arcade animate-pulse">
          Loading 3D Preview...
        </div>
      )}
    </div>
  );
};
