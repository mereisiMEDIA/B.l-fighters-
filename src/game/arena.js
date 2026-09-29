import * as THREE from 'three';

/**
 * Creates the big street-art concrete wall texture with "B.L CREW" and "MEREISI PROD."
 */
export function createConcreteGraffitiTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // 1. Weathered urban concrete wall
  ctx.fillStyle = '#b8b2a7';
  ctx.fillRect(0, 0, 2048, 1024);

  // Concrete block seams & horizontal mortar lines
  ctx.strokeStyle = '#8c857b';
  ctx.lineWidth = 5;
  for (let y = 256; y < 1024; y += 256) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(2048, y);
    ctx.stroke();
  }
  for (let row = 0; row < 4; row++) {
    const offset = (row % 2) * 256;
    for (let x = offset; x < 2048; x += 512) {
      ctx.beginPath();
      ctx.moveTo(x, row * 256);
      ctx.lineTo(x, (row + 1) * 256);
      ctx.stroke();
    }
  }

  // Realistic stucco weathering, stains, and vertical rain wash marks
  for (let i = 0; i < 45; i++) {
    const rx = (i * 47) % 2048;
    const rw = 15 + (i % 5) * 8;
    const rh = 100 + (i % 7) * 90;
    const grad = ctx.createLinearGradient(rx, 0, rx, rh);
    grad.addColorStop(0, 'rgba(80, 72, 64, 0.45)');
    grad.addColorStop(1, 'rgba(80, 72, 64, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(rx, 0, rw, rh);
  }

  // Stucco speckle noise
  for (let i = 0; i < 600; i++) {
    const px = Math.floor((i * 137.5) % 2048);
    const py = Math.floor((i * 269.3) % 1024);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(50,45,40,0.22)';
    ctx.fillRect(px, py, 2 + (i % 3), 2 + (i % 3));
  }

  // Helper for spray drips
  const drawDrip = (x, y, len, width, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x - width / 2, y);
    ctx.lineTo(x + width / 2, y);
    ctx.lineTo(x + width / 3, y + len);
    ctx.arc(x, y + len, width / 2, 0, Math.PI);
    ctx.lineTo(x - width / 3, y + len);
    ctx.closePath();
    ctx.fill();
  };

  // Helper for spray splatter dots
  const drawSplatter = (cx, cy, radius, count, color) => {
    ctx.fillStyle = color;
    for (let s = 0; s < count; s++) {
      const ang = (s / count) * Math.PI * 2 + (s * 1.7);
      const dist = (radius * 0.3) + ((s * 37) % (radius * 0.8));
      const dotR = 1.5 + (s % 4) * 1.2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // -------------------------------------------------------------
  // 2. HUGE "B.L CREW" STREET-ART PIECE (Centered on wall)
  // -------------------------------------------------------------
  const blX = 920;
  const blY = 520;

  // Wildstyle cloud background flare
  ctx.save();
  ctx.fillStyle = 'rgba(16, 185, 129, 0.45)'; // Emerald spray cloud
  ctx.beginPath();
  ctx.ellipse(blX, blY - 20, 520, 240, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(244, 63, 94, 0.4)'; // Hot pink outer aura
  ctx.beginPath();
  ctx.ellipse(blX + 20, blY - 10, 480, 210, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3D Extrusion shadow (Deep purple-black)
  ctx.font = '900 185px "Arial Black", Impact, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  ctx.fillStyle = '#0f051d';
  for (let o = 28; o > 0; o -= 3) {
    ctx.fillText('B.L CREW', blX + o, blY + o);
  }

  // Thick black street-art outline
  ctx.strokeStyle = '#05050a';
  ctx.lineWidth = 32;
  ctx.strokeText('B.L CREW', blX, blY);

  // Outer electric cyan outline stroke
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 14;
  ctx.strokeText('B.L CREW', blX, blY);

  // Vibrant gradient fill (Vivid Yellow -> Orange -> Hot Pink)
  const textGrad = ctx.createLinearGradient(blX - 400, blY - 90, blX + 400, blY + 90);
  textGrad.addColorStop(0, '#facc15'); // Bright chrome yellow
  textGrad.addColorStop(0.35, '#f97316'); // Fiery orange
  textGrad.addColorStop(0.7, '#ec4899'); // Hot magenta
  textGrad.addColorStop(1, '#a855f7'); // Electric purple
  ctx.fillStyle = textGrad;
  ctx.fillText('B.L CREW', blX, blY);

  // Inner glossy shine highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '900 178px "Arial Black", Impact, system-ui, sans-serif';
  ctx.fillText('B.L CREW', blX - 4, blY - 8);
  ctx.fillStyle = textGrad;
  ctx.fillText('B.L CREW', blX, blY);

  // Drips falling from bottom of B.L CREW letters
  const blDripPoints = [
    { x: blX - 340, y: blY + 80, len: 70, w: 8, col: '#facc15' },
    { x: blX - 270, y: blY + 85, len: 110, w: 9, col: '#f97316' },
    { x: blX - 160, y: blY + 80, len: 55, w: 7, col: '#f97316' },
    { x: blX - 40, y: blY + 85, len: 95, w: 10, col: '#ec4899' },
    { x: blX + 60, y: blY + 80, len: 60, w: 8, col: '#ec4899' },
    { x: blX + 180, y: blY + 85, len: 120, w: 11, col: '#a855f7' },
    { x: blX + 310, y: blY + 80, len: 80, w: 9, col: '#a855f7' },
  ];
  blDripPoints.forEach((d) => drawDrip(d.x, d.y, d.len, d.w, d.col));

  // Golden graffiti crown over the "B"
  const crownX = blX - 320;
  const crownY = blY - 145;
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(crownX - 45, crownY);
  ctx.lineTo(crownX - 55, crownY - 45);
  ctx.lineTo(crownX - 22, crownY - 20);
  ctx.lineTo(crownX, crownY - 60);
  ctx.lineTo(crownX + 22, crownY - 20);
  ctx.lineTo(crownX + 55, crownY - 45);
  ctx.lineTo(crownX + 45, crownY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // -------------------------------------------------------------
  // 3. "MEREISI PROD." TAG (Next to B.L CREW, smaller, marker tag style)
  // -------------------------------------------------------------
  const tagX = 1620;
  const tagY = 560;

  ctx.save();
  ctx.translate(tagX, tagY);
  ctx.rotate(-0.14);

  // Black marker shadow outline
  ctx.font = 'bold italic 82px "Trebuchet MS", "Comic Sans MS", cursive, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#0a0a0f';
  ctx.strokeText('MEREISI PROD.', 0, 0);

  // Bright Lime Green fill
  ctx.fillStyle = '#22c55e';
  ctx.fillText('MEREISI PROD.', 0, 0);

  // Tag underline with marker arrows
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-280, 52);
  ctx.quadraticCurveTo(0, 75, 280, 50);
  ctx.stroke();

  // Tag arrows
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.moveTo(280, 50);
  ctx.lineTo(250, 36);
  ctx.lineTo(255, 66);
  ctx.closePath();
  ctx.fill();

  // Marker drips
  drawDrip(-140, 60, 45, 6, '#22c55e');
  drawDrip(80, 62, 65, 7, '#22c55e');
  ctx.restore();

  // Extra spray paint details around the wall: stars, splatters, arrows
  drawSplatter(blX - 450, blY - 80, 70, 18, '#facc15');
  drawSplatter(blX + 460, blY - 60, 65, 16, '#06b6d4');
  drawSplatter(tagX + 220, tagY + 90, 55, 14, '#22c55e');

  // Mini stars
  const drawStar = (sx, sy, r, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(
        sx + Math.cos(((18 + i * 72) * Math.PI) / 180) * r,
        sy - Math.sin(((18 + i * 72) * Math.PI) / 180) * r
      );
      ctx.lineTo(
        sx + Math.cos(((54 + i * 72) * Math.PI) / 180) * (r * 0.45),
        sy - Math.sin(((54 + i * 72) * Math.PI) / 180) * (r * 0.45)
      );
    }
    ctx.closePath();
    ctx.fill();
  };
  drawStar(blX - 420, blY + 120, 24, '#facc15');
  drawStar(blX + 410, blY + 130, 20, '#ec4899');
  drawStar(tagX - 220, tagY - 80, 18, '#38bdf8');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates the worn basketball court canvas mat texture with "MEREISI PROD." corner stencil
 */
export function createWornRingMatTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Worn canvas / blue-gray tarp mat
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 1024, 1024);

  // Canvas weave / worn grunge texture
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let i = 0; i < 1024; i += 4) {
    ctx.fillRect(i, 0, 2, 1024);
  }
  for (let j = 0; j < 1024; j += 4) {
    ctx.fillRect(0, j, 1024, 2);
  }

  // Center fight circle (worn basketball center court marking on mat)
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.55)'; // Amber court line
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(512, 512, 280, 0, Math.PI * 2);
  ctx.stroke();

  // Center line
  ctx.beginPath();
  ctx.moveTo(512, 120);
  ctx.lineTo(512, 904);
  ctx.stroke();

  // Worn foot scuff marks in center
  for (let i = 0; i < 40; i++) {
    const sx = 400 + Math.random() * 224;
    const sy = 400 + Math.random() * 224;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, 18 + Math.random() * 25, 6 + Math.random() * 10, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Red & Blue tape corner boundary marks
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(60, 60, 180, 24);
  ctx.fillRect(60, 60, 24, 180);

  ctx.fillStyle = '#06b6d4';
  ctx.fillRect(1024 - 240, 60, 180, 24);
  ctx.fillRect(1024 - 84, 60, 24, 180);

  // "MEREISI PROD." stencil tag in bottom-left corner
  ctx.save();
  ctx.translate(180, 890);
  ctx.rotate(-0.06);
  ctx.font = 'bold 34px "Courier New", monospace, monospace';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillText('★ MEREISI PROD. [STENCIL] ★', 0, 0);
  ctx.fillStyle = '#f8fafc';
  ctx.fillText('★ MEREISI PROD. [STENCIL] ★', -2, -2);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates the ring apron front texture with "B.L CREW" spray paint
 */
export function createRingApronTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Black heavy vinyl apron
  ctx.fillStyle = '#0b0f19';
  ctx.fillRect(0, 0, 1024, 128);

  // Wrinkles / bottom shadow
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 100, 1024, 28);

  // "B.L CREW" sprayed across apron facing camera
  ctx.font = '900 68px "Arial Black", Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Spray shadow
  ctx.fillStyle = '#000000';
  ctx.fillText('★ B.L CREW ★', 514, 66);

  // Bright turquoise-cyan spray with yellow stars
  ctx.fillStyle = '#22d3ee';
  ctx.fillText('★ B.L CREW ★', 512, 64);

  // Spray paint drips from apron text
  ctx.fillStyle = '#22d3ee';
  for (let i = 0; i < 8; i++) {
    const dx = 320 + i * 55;
    ctx.fillRect(dx, 90, 4, 14 + (i % 3) * 8);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates Hebrew street and kiosk signs with ctx.direction = 'rtl'
 */
export function createHebrewSignTexture(type) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  if (type === 'kiosk') {
    canvas.width = 512;
    canvas.height = 128;
    // Glowing Israeli kiosk sign ("פיצוציית השכונה - פתוח 24/7")
    ctx.fillStyle = '#1e1b4b'; // Deep night blue
    ctx.fillRect(0, 0, 512, 128);

    // Glowing border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Hebrew shop name
    ctx.font = 'bold 38px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('קיוסק האחים • 24/7', 256, 50);

    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('שתייה קרה • ארטיקים • סיגריות', 256, 92);
  } else if (type === 'street') {
    canvas.width = 384;
    canvas.height = 128;
    // Israeli blue municipal street sign ("רחוב השלום")
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, 384, 128);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, 372, 116);

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 34px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('רחוב השלום', 192, 48);

    ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    ctx.fillStyle = '#e0f2fe';
    ctx.fillText('HA-SHALOM ST.', 192, 90);
  } else {
    canvas.width = 256;
    canvas.height = 128;
    // Bus stop sign ("תחנת אוטובוס - קווים 4, 16")
    ctx.fillStyle = '#eab308'; // Israeli yellow bus sign
    ctx.fillRect(0, 0, 256, 128);

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
    ctx.fillText('תחנת אוטובוס', 128, 42);

    ctx.font = '900 24px monospace';
    ctx.fillText('קווים: 4 • 16 • 72', 128, 86);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates the Israeli Shikun Apartment Window Wall Texture
 */
export function createShikunFacadeTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Dusty beige/off-white Israeli plaster ("שליכט / טיח ישן")
  ctx.fillStyle = '#dcd4c8';
  ctx.fillRect(0, 0, 1024, 1024);

  // Plaster cracks & weathering streaks
  ctx.strokeStyle = 'rgba(90, 80, 70, 0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(120, 0);
  ctx.lineTo(160, 280);
  ctx.lineTo(130, 520);
  ctx.moveTo(680, 200);
  ctx.lineTo(720, 600);
  ctx.stroke();

  // Windows in 4 floors
  const floors = 4;
  const cols = 5;
  for (let f = 0; f < floors; f++) {
    const y = 80 + f * 230;
    for (let c = 0; c < cols; c++) {
      const x = 50 + c * 195;
      const isLit = (f + c) % 3 === 0;

      // Window recess
      ctx.fillStyle = '#334155';
      ctx.fillRect(x, y, 120, 130);

      // Glass or warm sunset interior light turning on
      ctx.fillStyle = isLit ? '#fef08a' : '#1e293b';
      ctx.fillRect(x + 6, y + 6, 108, 118);

      // Window frame / trisim (shutters)
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 6, y + 6, 108, 118);
      ctx.beginPath();
      ctx.moveTo(x + 60, y + 6);
      ctx.lineTo(x + 60, y + 124);
      ctx.moveTo(x + 6, y + 65);
      ctx.lineTo(x + 114, y + 65);
      ctx.stroke();

      // Air conditioner unit below window
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(x + 15, y + 142, 90, 48);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 15, y + 142, 90, 48);
      // Fan grill
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(x + 40, y + 166, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Complete Israeli Neighborhood Sunset Arena Environment
 */
export class ArenaEnvironment {
  constructor(scene) {
    this.scene = scene;
    this.crowdMembers = [];
    this.crowdInstanced = null;
    this.crowdDummy = new THREE.Object3D();
    this.crowdColors = [];
    this.crowdCount = 70;
    this.occludableMeshes = [];

    // Main parent group for all arena elements
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Build complete Israeli sunset environment
    this.buildSunsetSky();
    this.buildLighting();
    this.buildBasketballCourt();
    this.buildStreetRing();
    this.buildConcreteWallWithGraffiti();
    this.buildShikunApartmentBlocks();
    this.buildStreetEnvironment();
    this.buildNeighborsCrowd();
  }

  /**
   * 1. Warm orange-pink Israeli sunset sky dome
   */
  buildSunsetSky() {
    // Large curved sky backdrop
    const skyGeo = new THREE.SphereGeometry(75, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#312e81'); // Twilight indigo at zenith
      grad.addColorStop(0.3, '#7c2d12'); // Rich burnt amber
      grad.addColorStop(0.55, '#ea580c'); // Radiant sunset orange
      grad.addColorStop(0.8, '#f43f5e'); // Soft sunset rose pink
      grad.addColorStop(1, '#fed7aa'); // Golden horizon haze
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      // Low golden sunset sun on horizon
      const sunGrad = ctx.createRadialGradient(256, 420, 10, 256, 420, 140);
      sunGrad.addColorStop(0, '#ffffff');
      sunGrad.addColorStop(0.2, '#fef08a');
      sunGrad.addColorStop(0.6, 'rgba(251, 146, 60, 0.6)');
      sunGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(256, 420, 140, 0, Math.PI * 2);
      ctx.fill();

      // Silhouetted swallows / birds in flight
      ctx.fillStyle = 'rgba(30, 27, 75, 0.7)';
      const drawBird = (bx, by, s) => {
        ctx.beginPath();
        ctx.moveTo(bx - s * 12, by - s * 4);
        ctx.quadraticCurveTo(bx - s * 6, by - s * 10, bx, by);
        ctx.quadraticCurveTo(bx + s * 6, by - s * 10, bx + s * 12, by - s * 4);
        ctx.stroke();
      };
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(30, 27, 75, 0.75)';
      drawBird(180, 260, 1.2);
      drawBird(220, 240, 1.5);
      drawBird(260, 255, 1.1);
      drawBird(380, 290, 1.4);
    }
    const skyTex = new THREE.CanvasTexture(canvas);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    skyMesh.rotation.y = -Math.PI * 0.45;
    this.group.add(skyMesh);
  }

  /**
   * 2. Warm sunset lighting & 2 street lamps
   */
  buildLighting() {
    // Warm sunset directional light casting dramatic long shadows from side
    const sunsetDirLight = new THREE.DirectionalLight(0xffa256, 2.2);
    sunsetDirLight.position.set(-18, 14, 6);
    sunsetDirLight.target.position.set(0, 0, 0);
    sunsetDirLight.castShadow = true;
    sunsetDirLight.shadow.mapSize.width = 2048;
    sunsetDirLight.shadow.mapSize.height = 2048;
    sunsetDirLight.shadow.camera.near = 2;
    sunsetDirLight.shadow.camera.far = 40;
    sunsetDirLight.shadow.bias = -0.0003;
    this.group.add(sunsetDirLight);
    this.group.add(sunsetDirLight.target);

    // Warm ambient fill for soft shadows (never pitch dark)
    const ambientLight = new THREE.AmbientLight(0xfda4af, 0.95);
    this.group.add(ambientLight);

    // Soft front fill from camera direction to illuminate fighters' faces clearly
    // Front fill light from high overhead
    const frontFill = new THREE.DirectionalLight(0xffedd5, 1.3);
    frontFill.position.set(0, 10, 12);
    this.group.add(frontFill);

    // Ring spotlights from above/back (NO pole or geometry standing in front of fighters)
    const ringSpot1 = new THREE.SpotLight(0xfff3d6, 3.2, 28, Math.PI / 3.2, 0.4, 1.2);
    ringSpot1.position.set(-6.4, 8.5, -4.5);
    ringSpot1.target.position.set(-1.5, 0.8, 0);
    this.group.add(ringSpot1);
    this.group.add(ringSpot1.target);

    const ringSpot2 = new THREE.SpotLight(0xfff3d6, 3.2, 28, Math.PI / 3.2, 0.4, 1.2);
    ringSpot2.position.set(6.4, 8.5, -4.5);
    ringSpot2.target.position.set(1.5, 0.8, 0);
    this.group.add(ringSpot2);
    this.group.add(ringSpot2.target);
  }

  /**
   * 3. Outdoor basketball court pavement
   */
  buildBasketballCourt() {
    // Basketball court ground floor at Y = -0.42 (Expanded to fill entire bottom of screen)
    const courtGeo = new THREE.PlaneGeometry(64, 64);
    const courtMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a2b, // Classic Israeli green municipal court asphalt
      roughness: 0.85,
    });
    const court = new THREE.Mesh(courtGeo, courtMat);
    court.rotation.x = -Math.PI / 2;
    court.position.set(0, -0.42, 6);
    court.receiveShadow = true;
    this.group.add(court);

    // Basketball court key / painted free-throw arc lines (terracotta & white)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
    const arcGeo = new THREE.RingGeometry(4.8, 5.0, 32, 1, 0, Math.PI);
    const arc = new THREE.Mesh(arcGeo, lineMat);
    arc.rotation.x = -Math.PI / 2;
    arc.position.set(0, -0.415, 0);
    this.group.add(arc);

    // Basketball hoop on court edge (back left)
    const hoopGroup = new THREE.Group();
    hoopGroup.position.set(-11, -0.42, -5);

    const hoopPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 6.5, 10),
      new THREE.MeshStandardMaterial({ color: 0x2563eb })
    );
    hoopPole.position.y = 3.25;
    hoopGroup.add(hoopPole);

    // Overhang arm
    const hoopArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x2563eb })
    );
    hoopArm.position.set(0, 5.8, 0.8);
    hoopGroup.add(hoopArm);

    // White fan-shaped backboard with red box
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 0.08), boardMat);
    board.position.set(0, 5.8, 1.7);
    hoopGroup.add(board);

    // Orange metal rim
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xf97316 });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 8, 16), rimMat);
    rim.position.set(0, 5.3, 2.15);
    rim.rotation.x = Math.PI / 2;
    hoopGroup.add(rim);

    this.group.add(hoopGroup);
  }

  /**
   * 4. DIY Street Ring (Wooden posts with duct tape, worn mat, 3 ropes on BACK side only, white plastic chairs OUTSIDE ring)
   */
  buildStreetRing() {
    const ringPlatform = new THREE.Group();

    // Ring platform base: top surface exactly at Y = 0 (so fighter physics y=0 is perfect!)
    // Height: 0.42 units, extending from Y = -0.42 to Y = 0
    const matTexture = createWornRingMatTexture();
    const matGeo = new THREE.BoxGeometry(15.5, 0.42, 15.5);

    const matMaterial = new THREE.MeshStandardMaterial({
      map: matTexture,
      roughness: 0.8,
    });
    const ringMatMesh = new THREE.Mesh(matGeo, matMaterial);
    ringMatMesh.position.set(0, -0.21, 0);
    ringMatMesh.receiveShadow = true;
    ringPlatform.add(ringMatMesh);

    // Ring Apron with "B.L CREW" graffiti facing camera (Front skirt)
    const apronTexture = createRingApronTexture();
    const apronMat = new THREE.MeshStandardMaterial({
      map: apronTexture,
      roughness: 0.9,
    });
    const apronGeo = new THREE.PlaneGeometry(15.5, 0.42);
    const frontApron = new THREE.Mesh(apronGeo, apronMat);
    frontApron.position.set(0, -0.21, 7.76);
    ringPlatform.add(frontApron);

    // 2 Back Corner Posts: Sturdy wood with silver duct tape wrapping (Front left & right left open for clean camera view)
    const postPositions = [
      { x: -6.8, z: -6.8 }, // Back Left
      { x: 6.8, z: -6.8 },  // Back Right
    ];

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x854d0e, // Rich sturdy timber brown
      roughness: 0.85,
    });
    const ductTapeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Silver/gray reflective duct tape
      metalness: 0.7,
      roughness: 0.25,
    });

    postPositions.forEach((pos) => {
      const postGroup = new THREE.Group();
      postGroup.position.set(pos.x, 0, pos.z);

      // Wooden post
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 3.2, 10), woodMat);
      post.position.y = 1.35;
      post.castShadow = true;
      postGroup.add(post);

      // Duct tape bands wrapped around post (classic street DIY ring)
      const tape1 = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.35, 12), ductTapeMat);
      tape1.position.y = 1.95;
      postGroup.add(tape1);

      const tape2 = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.35, 12), ductTapeMat);
      tape2.position.y = 1.35;
      postGroup.add(tape2);

      const tape3 = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.35, 12), ductTapeMat);
      tape3.position.y = 0.75;
      postGroup.add(tape3);

      this.occludableMeshes.push(post);
      ringPlatform.add(postGroup);
    });

    // 3 Thick Ropes ON THE BACK SIDE ONLY (between the 2 back posts at z = -6.8)
    const ropeHeights = [0.75, 1.35, 1.95];
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 }); // Thick golden-brown hemp

    ropeHeights.forEach((rh) => {
      // Back rope between (-6.8, -6.8) and (6.8, -6.8)
      const backRope = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 13.6, 8), ropeMat);
      backRope.rotation.z = Math.PI / 2;
      backRope.position.set(0, rh - 0.05, -6.8); // slight sag
      ringPlatform.add(backRope);
    });

    // White Plastic Lawn Chairs placed OUTSIDE the ring on the court floor
    const chairMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const chairPositions = [
      // Left side outside ring
      { x: -8.8, z: -3.8, r: 0.5 },
      { x: -8.8, z: 0.0, r: 0.25 },
      { x: -8.8, z: 3.8, r: -0.2 },
      // Right side outside ring
      { x: 8.8, z: -3.8, r: -0.5 },
      { x: 8.8, z: 0.0, r: -0.25 },
      { x: 8.8, z: 3.8, r: 0.2 },
      // Back side outside ring
      { x: -3.5, z: -8.6, r: 0.1 },
      { x: 3.5, z: -8.6, r: -0.1 },
    ];

    chairPositions.forEach((cp) => {
      const chair = new THREE.Group();
      chair.position.set(cp.x, -0.42, cp.z);
      chair.rotation.y = cp.r;

      // Seat
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.6), chairMat);
      seat.position.y = 0.5;
      chair.add(seat);

      // Backrest
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.05), chairMat);
      back.position.set(0, 0.8, -0.28);
      back.rotation.x = -0.15;
      chair.add(back);

      // 4 Legs
      for (let lx = -1; lx <= 1; lx += 2) {
        for (let lz = -1; lz <= 1; lz += 2) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.5, 6), chairMat);
          leg.position.set(lx * 0.26, 0.25, lz * 0.24);
          chair.add(leg);
        }
      }
      ringPlatform.add(chair);
    });

    this.group.add(ringPlatform);
  }

  /**
   * 5. Big Concrete Wall behind ring with Graffiti piece & tags
   */
  buildConcreteWallWithGraffiti() {
    const wallGroup = new THREE.Group();
    // Positioned behind court ring, clearly in main camera viewport
    wallGroup.position.set(0, 3.2, -6.6);

    const wallTex = createConcreteGraffitiTexture();
    const wallGeo = new THREE.PlaneGeometry(24, 7.5);
    const wallMat = new THREE.MeshStandardMaterial({
      map: wallTex,
      roughness: 0.9,
    });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.receiveShadow = true;
    wallGroup.add(wallMesh);

    // Wall top concrete coping cap
    const capGeo = new THREE.BoxGeometry(24.4, 0.25, 0.6);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.8 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 3.85, 0);
    wallGroup.add(cap);

    this.group.add(wallGroup);
  }

  /**
   * 6. Background Israeli Shikun Apartment Blocks (4 Floors, Solar tanks, ACs, Balconies)
   */
  buildShikunApartmentBlocks() {
    const shikunGroup = new THREE.Group();
    shikunGroup.position.set(0, 0, -14);

    const facadeTex = createShikunFacadeTexture();
    const shikunMat = new THREE.MeshStandardMaterial({
      map: facadeTex,
      roughness: 0.9,
    });

    // 2 Shikun blocks (Left & Right)
    const blocks = [
      { x: -12, z: 0, w: 18, h: 12, d: 8 },
      { x: 10, z: -1, w: 19, h: 12, d: 8 },
    ];

    blocks.forEach((b) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(b.x, -0.42, b.z);

      // Building main body
      const building = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), shikunMat);
      building.position.y = b.h / 2;
      building.castShadow = true;
      building.receiveShadow = true;
      bGroup.add(building);

      // Balconies on facade
      const balconyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 });
      const trisimMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.4 });

      for (let floor = 1; floor <= 3; floor++) {
        for (let bx = -b.w / 2 + 3; bx < b.w / 2 - 2; bx += 5.5) {
          const balc = new THREE.Group();
          balc.position.set(bx, floor * 3.1, b.d / 2 + 0.6);

          // Balcony slab
          const slab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 1.4), balconyMat);
          balc.add(slab);

          // Some balconies closed with aluminum shutters ("תריסים / סגירת מרפסת")
          const isClosed = (floor + Math.abs(Math.floor(bx))) % 2 === 0;
          if (isClosed) {
            const trisim = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.8, 0.1), trisimMat);
            trisim.position.set(0, 0.9, 0.6);
            balc.add(trisim);
          } else {
            // Open railing with laundry clothesline!
            const rail = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.9, 0.08), balconyMat);
            rail.position.set(0, 0.45, 0.6);
            balc.add(rail);

            // Laundry line with colorful clothes
            const clothesColors = [0xef4444, 0x3b82f6, 0xfacc15, 0xec4899, 0xf8fafc];
            for (let c = 0; c < 4; c++) {
              const cloth = new THREE.Mesh(
                new THREE.PlaneGeometry(0.45, 0.6),
                new THREE.MeshBasicMaterial({ color: clothesColors[(c + floor) % clothesColors.length], side: THREE.DoubleSide })
              );
              cloth.position.set(-1.2 + c * 0.8, 0.45, 0.65);
              balc.add(cloth);
            }
          }
          bGroup.add(balc);
        }
      }

      // Roof: Solar Water Heaters ("דודי שמש") & Satellite Dishes ("צלחות לוויין")
      const roofY = b.h;
      const roofParapet = new THREE.Mesh(
        new THREE.BoxGeometry(b.w + 0.3, 0.5, b.d + 0.3),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
      );
      roofParapet.position.y = roofY + 0.25;
      bGroup.add(roofParapet);

      // White cylinder water tanks & black angled solar collector panels
      const tankMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
      const solarMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.2 });

      for (let s = -b.w / 2 + 2; s < b.w / 2 - 2; s += 3.5) {
        const heater = new THREE.Group();
        heater.position.set(s, roofY + 0.5, -b.d / 2 + 2.5);

        // Cylinder tank
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.4, 12), tankMat);
        tank.rotation.z = Math.PI / 2;
        tank.position.y = 1.2;
        heater.add(tank);

        // Black glass solar collector panel (angled)
        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.08), solarMat);
        panel.position.set(0, 0.7, 0.7);
        panel.rotation.x = Math.PI * 0.28;
        heater.add(panel);

        bGroup.add(heater);
      }

      // Satellite dish
      const dishGroup = new THREE.Group();
      dishGroup.position.set(b.w / 2 - 2, roofY + 0.5, b.d / 2 - 2);
      const dish = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45),
        new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.5, side: THREE.DoubleSide })
      );
      dish.rotation.x = Math.PI * 0.75;
      dishGroup.add(dish);
      bGroup.add(dishGroup);

      shikunGroup.add(bGroup);
    });

    this.group.add(shikunGroup);
  }

  /**
   * 7. Israeli Street: Palm trees, cypress, kiosk with Hebrew sign, green dumpster with cats, bus stop
   */
  buildStreetEnvironment() {
    const streetGroup = new THREE.Group();

    // Israeli Palm Trees & Cypress Trees
    const makePalmTree = (px, pz, scale = 1.0) => {
      const palm = new THREE.Group();
      palm.position.set(px, -0.42, pz);
      palm.scale.set(scale, scale, scale);

      // Textured shaggy trunk
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.95 });
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 8.5, 8), trunkMat);
      trunk.position.set(0, 4.25, 0);
      trunk.rotation.z = 0.04;
      palm.add(trunk);

      // Palm fronds (leaf fan)
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.7, side: THREE.DoubleSide });
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2;
        const frond = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.2), leafMat);
        frond.position.set(Math.cos(ang) * 1.4, 8.4, Math.sin(ang) * 1.4);
        frond.rotation.set(0.6, ang, 0);
        palm.add(frond);
      }
      return palm;
    };

    const makeCypressTree = (cx, cz, height = 7.5) => {
      const cypress = new THREE.Group();
      cypress.position.set(cx, -0.42, cz);
      const folMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.9 });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.7, height, 8), folMat);
      cone.position.y = height / 2;
      cypress.add(cone);
      return cypress;
    };

    streetGroup.add(makePalmTree(-14.5, -3, 1.1));
    streetGroup.add(makePalmTree(14.0, -4, 1.15));
    streetGroup.add(makeCypressTree(-16.0, -8, 8.5));
    streetGroup.add(makeCypressTree(-13.5, -9, 7.0));
    streetGroup.add(makeCypressTree(15.5, -8, 8.0));

    // Neighborhood Kiosk with lit Hebrew sign (Right side: "קיוסק האחים • 24/7")
    const kiosk = new THREE.Group();
    kiosk.position.set(13.5, -0.42, -1.5);

    // Kiosk booth
    const booth = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 3.2, 3.5),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 })
    );
    booth.position.y = 1.6;
    kiosk.add(booth);

    // Lit Hebrew Sign on kiosk
    const kioskSignTex = createHebrewSignTexture('kiosk');
    const kioskSign = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 1.1),
      new THREE.MeshBasicMaterial({ map: kioskSignTex })
    );
    kioskSign.position.set(-0.8, 2.8, 1.77);
    kiosk.add(kioskSign);

    // Awning (Striped orange/white)
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 0.15, 1.6),
      new THREE.MeshStandardMaterial({ color: 0xf97316 })
    );
    awning.position.set(0, 2.3, 2.2);
    awning.rotation.x = 0.25;
    kiosk.add(awning);

    streetGroup.add(kiosk);

    // Israeli Street Sign ("רחוב השלום")
    const streetSign = new THREE.Group();
    streetSign.position.set(-9.5, -0.42, 4.5);
    const signPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 3.8, 8),
      new THREE.MeshStandardMaterial({ color: 0x64748b })
    );
    signPole.position.y = 1.9;
    streetSign.add(signPole);

    const streetSignTex = createHebrewSignTexture('street');
    const streetPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 0.55),
      new THREE.MeshBasicMaterial({ map: streetSignTex })
    );
    streetPlate.position.set(0, 3.4, 0);
    streetPlate.rotation.y = 0.1;
    streetSign.add(streetPlate);
    streetGroup.add(streetSign);

    // Israeli Green Municipal Dumpster ("צפרדע ירוקה") with cats perched on it!
    const dumpster = new THREE.Group();
    dumpster.position.set(-10.5, -0.42, -1.0);

    const dBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 1.6, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 })
    );
    dBody.position.y = 0.8;
    dumpster.add(dBody);

    // Sloped lids
    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.1, 0.9),
      new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.9 })
    );
    lid.position.set(0, 1.65, 0.4);
    lid.rotation.x = -0.15;
    dumpster.add(lid);

    // Cat 1 (Ginger tabby sitting on dumpster)
    const cat1 = new THREE.Group();
    cat1.position.set(-0.6, 1.7, 0.2);
    const cat1Body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.2), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
    cat1.add(cat1Body);
    const cat1Head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
    cat1Head.position.set(0.18, 0.12, 0);
    cat1.add(cat1Head);
    dumpster.add(cat1);

    // Cat 2 (Black & white tuxedo cat perched on edge)
    const cat2 = new THREE.Group();
    cat2.position.set(0.5, 1.7, -0.3);
    const cat2Body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.18), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    cat2.add(cat2Body);
    const cat2Head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
    cat2Head.position.set(-0.16, 0.1, 0);
    cat2.add(cat2Head);
    dumpster.add(cat2);

    streetGroup.add(dumpster);

    // Parked car (Israeli city hatchback in background)
    const car = new THREE.Group();
    car.position.set(-14.5, -0.42, 2.5);
    car.rotation.y = 0.15;

    const carBody = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 1.1, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.5 })
    );
    carBody.position.y = 0.7;
    car.add(carBody);

    const carCabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.85, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2 })
    );
    carCabin.position.set(-0.2, 1.5, 0);
    car.add(carCabin);

    streetGroup.add(car);
    this.group.add(streetGroup);
  }

  /**
   * 8. Neighbors Crowd (around ring & on balconies) using InstancedMesh for 60fps mobile speed
   */
  buildNeighborsCrowd() {
    this.crowdMembers = [];

    // Crowd locations: ring side spectators & shikun balcony spectators
    const spectators = [];

    // Ring-side spectators (Standing and sitting around the basketball court)
    for (let i = -7; i <= 7; i += 1.4) {
      if (Math.abs(i) < 2) continue; // keep front center open for camera
      spectators.push({
        x: i,
        y: -0.42,
        z: -5.8 + (Math.sin(i * 3) * 0.4),
        type: 'ground',
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Balcony spectators (leaning on Shikun balconies)
    const balconyX = [-14, -11, -8, 6, 9, 12];
    for (let floor = 1; floor <= 3; floor++) {
      balconyX.forEach((bx, idx) => {
        if ((floor + idx) % 2 === 0) {
          spectators.push({
            x: bx + (Math.random() - 0.5) * 0.8,
            y: -0.42 + floor * 3.1 + 0.2,
            z: -13.2,
            type: 'balcony',
            phase: Math.random() * Math.PI * 2,
          });
        }
      });
    }

    this.crowdCount = spectators.length;
    this.spectatorData = spectators;

    // InstancedMesh for neighbors' bodies (Box) and heads (Sphere)
    const bodyGeo = new THREE.BoxGeometry(0.38, 0.65, 0.28);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.crowdInstanced = new THREE.InstancedMesh(bodyGeo, bodyMat, this.crowdCount);
    this.crowdInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.crowdInstanced.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.crowdCount * 3), 3);

    // Colorful casual street clothes palette
    const crowdColors = [
      0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0x8b5cf6,
      0xec4899, 0x06b6d4, 0x64748b, 0xd97706, 0x1e293b,
    ];

    const tempColor = new THREE.Color();
    spectators.forEach((s, idx) => {
      tempColor.setHex(crowdColors[idx % crowdColors.length]);
      this.crowdInstanced.setColorAt(idx, tempColor);
      this.crowdDummy.position.set(s.x, s.y + 0.5, s.z);
      this.crowdDummy.updateMatrix();
      this.crowdInstanced.setMatrixAt(idx, this.crowdDummy.matrix);
    });

    this.crowdInstanced.instanceMatrix.needsUpdate = true;
    if (this.crowdInstanced.instanceColor) {
      this.crowdInstanced.instanceColor.needsUpdate = true;
    }
    this.group.add(this.crowdInstanced);
  }

  /**
   * Updates crowd animation: idle bobbing + cheering with arms raised on big hits/KO!
   */
  update(timeMs, gameState) {
    if (!this.crowdInstanced || !this.spectatorData) return;

    const time = timeMs * 0.004;
    // Check if exciting fight event is happening (big hit, screen shake, super, or KO)
    const isSleeping = gameState && gameState.matthewSleepSuper && gameState.matthewSleepSuper.crowdAsleep;
    const isCraterPanic = gameState && gameState.matthewSleepSuper && gameState.matthewSleepSuper.phase === 'CRATER_PANIC';

    const isCheering =
      (gameState && (
        (gameState.screenShake && gameState.screenShake > 4) ||
        (gameState.hitStopTicks && gameState.hitStopTicks > 0) ||
        (gameState.p1 && gameState.p1.isKo) ||
        (gameState.p2 && gameState.p2.isKo)
      ));

    this.spectatorData.forEach((s, idx) => {
      let jumpY = 0;
      let scaleY = 1.0;

      if (isSleeping) {
        // Crowd heads droop and slump forward asleep!
        jumpY = -0.16;
        scaleY = 0.78;
      } else if (isCraterPanic) {
        // Crowd wakes up in panic and shock!
        jumpY = Math.abs(Math.sin(time * 6 + s.phase)) * 0.45;
        scaleY = 1.35;
      } else if (isCheering) {
        // High energetic cheering jump
        jumpY = Math.abs(Math.sin(time * 3 + s.phase)) * 0.35;
        scaleY = 1.25; // stretches with arms up
      } else {
        // Subtle ambient street bob
        jumpY = Math.abs(Math.sin(time + s.phase)) * 0.08;
      }

      this.crowdDummy.position.set(s.x, s.y + 0.5 + jumpY, s.z);
      this.crowdDummy.scale.set(1.0, scaleY, 1.0);
      this.crowdDummy.updateMatrix();
      this.crowdInstanced.setMatrixAt(idx, this.crowdDummy.matrix);
    });

    this.crowdInstanced.instanceMatrix.needsUpdate = true;
  }
}
