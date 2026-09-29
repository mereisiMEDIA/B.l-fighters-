import * as THREE from 'three';

/**
 * Mobile-optimized Cartoon Visual Effects System
 * Designed specifically for portrait mobile screens with bold, high-contrast visuals,
 * strict object pooling (max 150 active particles), and zero runtime GC allocations.
 */

// Color Constants
export const COLOR_BLOOD = 0xff1a1a;  // Bright cartoon red (#FF1A1A)
export const COLOR_SWEAT = 0x38bdf8;  // Bright light-blue (#38BDF8)
export const COLOR_TEAR = 0x60a5fa;   // Bright cartoon blue (#60A5FA)
export const COLOR_TOOTH = 0xffffff;  // Clean white molar tooth
export const COLOR_STAR = 0xfacc15;   // Comic golden star (#FACC15)
export const COLOR_BREATH = 0xf1f5f9; // Puffy breath
export const COLOR_SPARK = 0xf59e0b;  // Hit spark gold

export const MAX_PARTICLES = 150;     // Strictly capped for smooth 60fps on mid-range phones
export const MAX_SPLATS = 60;         // Mat blood stains pool
export const SPLAT_DURATION = 600;    // 10 seconds at 60fps

/**
 * Procedural texture generator for cartoon blood splats on the ring mat
 */
function createCartoonSplatTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);

    // Main splat blob with organic lobes
    ctx.fillStyle = '#ff1a1a';
    ctx.beginPath();
    ctx.arc(64, 64, 38, 0, Math.PI * 2);
    ctx.fill();

    // Satellite droplets & spatter spikes
    const lobes = [
      { x: 30, y: 50, r: 16 },
      { x: 95, y: 48, r: 18 },
      { x: 50, y: 96, r: 17 },
      { x: 80, y: 92, r: 15 },
      { x: 74, y: 26, r: 14 },
      { x: 22, y: 82, r: 10 },
      { x: 104, y: 78, r: 9 },
      { x: 42, y: 20, r: 8 },
    ];
    lobes.forEach(l => {
      ctx.beginPath();
      ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Darker red rim for cartoon depth
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Small glossy highlight
    ctx.fillStyle = '#fca5a5';
    ctx.beginPath();
    ctx.arc(56, 52, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/**
 * Redraws the dynamic 2D cartoon face damage texture for a fighter
 * Level 0: Clean
 * Level 1 (<= 60% HP): Purple bruise on cheek
 * Level 2 (<= 40% HP): Black eye ring around eye socket
 * Level 3 (<= 20% HP): Bleeding nose dripping red + eyebrow cut
 */
export function drawFaceDamageCanvas(ctx, w, h, level) {
  ctx.clearRect(0, 0, w, h);
  if (level <= 0) return;

  // Level 1 (60% HP): Cartoon bruise on cheek
  if (level >= 1) {
    // Outer bruise halo
    ctx.fillStyle = 'rgba(88, 28, 135, 0.85)';
    ctx.beginPath();
    ctx.ellipse(w * 0.72, h * 0.60, 32, 22, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Inner deep purple core
    ctx.fillStyle = 'rgba(126, 34, 206, 0.65)';
    ctx.beginPath();
    ctx.ellipse(w * 0.74, h * 0.60, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Level 2 (40% HP): Black eye ring
  if (level >= 2) {
    // Swollen dark ring around eye
    ctx.strokeStyle = 'rgba(46, 16, 101, 0.95)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.ellipse(w * 0.68, h * 0.38, 28, 24, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dark hematoma fill
    ctx.fillStyle = 'rgba(30, 27, 75, 0.55)';
    ctx.beginPath();
    ctx.ellipse(w * 0.68, h * 0.38, 22, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Level 3 (20% HP): Bleeding nose & eyebrow cut
  if (level >= 3) {
    // Bleeding nose trail dripping down
    ctx.fillStyle = '#ff1a1a';
    ctx.beginPath();
    ctx.moveTo(w * 0.52, h * 0.56);
    ctx.lineTo(w * 0.56, h * 0.76);
    ctx.lineTo(w * 0.60, h * 0.80);
    ctx.lineTo(w * 0.54, h * 0.81);
    ctx.lineTo(w * 0.49, h * 0.58);
    ctx.closePath();
    ctx.fill();

    // Drip droplet hanging at tip of nose bleed
    ctx.beginPath();
    ctx.arc(w * 0.57, h * 0.83, 7, 0, Math.PI * 2);
    ctx.fill();

    // Small cartoon cut on eyebrow
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.24, h * 0.22);
    ctx.lineTo(w * 0.39, h * 0.28);
    ctx.stroke();

    // Eyebrow blood bead
    ctx.fillStyle = '#ff1a1a';
    ctx.beginPath();
    ctx.arc(w * 0.33, h * 0.29, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Creates the circling stars 3D group for a fighter when knocked down / dazed
 */
export function createDazedStarsGroup() {
  const group = new THREE.Group();
  const starGeo = new THREE.OctahedronGeometry(0.12, 0);
  const starMat = new THREE.MeshBasicMaterial({ color: COLOR_STAR });
  const starCount = 4;
  const radius = 0.46;

  for (let i = 0; i < starCount; i++) {
    const angle = (i / starCount) * Math.PI * 2;
    const mesh = new THREE.Mesh(starGeo, starMat);
    mesh.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    mesh.scale.set(1.35, 1.35, 0.7);
    group.add(mesh);
  }

  group.rotation.x = 0.25;
  group.visible = false;
  return group;
}

/**
 * Complete Visual Effects System class
 */
export class VisualEffectsSystem {
  constructor(scene) {
    this.scene = scene;

    // 1. Particle Pooling
    this.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        color: COLOR_BLOOD,
        size: 0.25,
        life: 0,
        maxLife: 30,
        shape: 'spark',
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        vRotX: 0,
        vRotY: 0,
      });
    }

    // 2. Mat Splats Pooling (10 second floor blood stains)
    this.splats = [];
    for (let i = 0; i < MAX_SPLATS; i++) {
      this.splats.push({
        active: false,
        x: 0,
        z: 0,
        scale: 0.35,
        rotation: 0,
        life: 0,
        maxLife: SPLAT_DURATION,
      });
    }

    // 3. 3D Instanced Rendering Setup
    this.dummy = new THREE.Object3D();
    this.tempColor = new THREE.Color();

    // Particle InstancedMesh
    const pGeo = new THREE.DodecahedronGeometry(0.14, 0);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleInstanced = new THREE.InstancedMesh(pGeo, pMat, MAX_PARTICLES);
    this.particleInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleInstanced.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(MAX_PARTICLES * 3),
      3
    );
    this.scene.add(this.particleInstanced);

    // Mat Splats InstancedMesh with cartoon blood texture
    const splatGeo = new THREE.PlaneGeometry(0.68, 0.68);
    splatGeo.rotateX(-Math.PI / 2);
    this.splatTexture = createCartoonSplatTexture();
    const splatMat = new THREE.MeshBasicMaterial({
      map: this.splatTexture,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    this.splatInstanced = new THREE.InstancedMesh(splatGeo, splatMat, MAX_SPLATS);
    this.splatInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.splatInstanced);

    // Clear initial matrices to zero scale
    this.dummy.scale.set(0, 0, 0);
    this.dummy.updateMatrix();
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particleInstanced.setMatrixAt(i, this.dummy.matrix);
    }
    this.particleInstanced.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < MAX_SPLATS; i++) {
      this.splatInstanced.setMatrixAt(i, this.dummy.matrix);
    }
    this.splatInstanced.instanceMatrix.needsUpdate = true;
  }

  /**
   * Spawns pooled particles
   */
  spawnParticles(x, y, z, count, color, shape, baseSize = 0.22, customVel = null) {
    let spawned = 0;
    for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
      const p = this.particles[i];
      if (p.active) continue;

      p.active = true;
      p.x = x;
      p.y = y;
      p.z = z + (Math.random() - 0.5) * 0.15;
      p.color = color;
      p.size = baseSize * (0.85 + Math.random() * 0.35);
      p.shape = shape;
      p.rotX = Math.random() * Math.PI * 2;
      p.rotY = Math.random() * Math.PI * 2;
      p.vRotX = (Math.random() - 0.5) * 0.2;
      p.vRotY = (Math.random() - 0.5) * 0.2;

      const angle = Math.random() * Math.PI * 2;
      const speed = (0.05 + Math.random() * 0.11) * (baseSize > 0.25 ? 1.3 : 1.0);

      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed + 0.04;
      p.vz = (Math.random() - 0.5) * 0.06;
      p.life = 25 + Math.floor(Math.random() * 12);
      p.maxLife = p.life;

      if (shape === 'blood') {
        // Cartoon red droplets: large and elongated, bursting outward & upward
        p.vx = (Math.random() - 0.5) * 0.15;
        p.vy = 0.07 + Math.random() * 0.14;
        p.vz = (Math.random() - 0.5) * 0.12;
        p.life = 60 + Math.floor(Math.random() * 20);
        p.maxLife = p.life;
      } else if (shape === 'tooth') {
        // Flying white tooth on super hit
        p.vx = customVel?.vx ?? (Math.random() > 0.5 ? 0.09 : -0.09);
        p.vy = customVel?.vy ?? (0.19 + Math.random() * 0.05);
        p.vz = (Math.random() - 0.5) * 0.06;
        p.life = 75;
        p.maxLife = 75;
      } else if (shape === 'sweat') {
        // Bright light-blue sweat drops
        p.vx = customVel?.vx ?? (Math.random() - 0.5) * 0.10;
        p.vy = customVel?.vy ?? (0.06 + Math.random() * 0.08);
        p.vz = (Math.random() - 0.5) * 0.06;
        p.life = 30 + Math.floor(Math.random() * 12);
        p.maxLife = p.life;
      } else if (shape === 'tear') {
        // Blue tears
        p.vx = customVel?.vx ?? (Math.random() - 0.5) * 0.08;
        p.vy = customVel?.vy ?? (-0.02 - Math.random() * 0.04);
        p.vz = (Math.random() - 0.5) * 0.04;
        p.life = 38 + Math.floor(Math.random() * 15);
        p.maxLife = p.life;
      } else if (shape === 'breath') {
        p.vx = customVel?.vx ?? 0.018;
        p.vy = customVel?.vy ?? 0.014;
        p.life = 35;
        p.maxLife = 35;
      }

      spawned++;
    }

    // If pool was full, steal the oldest particle
    if (spawned < count) {
      for (let i = 0; i < MAX_PARTICLES && spawned < count; i++) {
        const p = this.particles[i];
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        p.color = color;
        p.size = baseSize;
        p.shape = shape;
        p.vx = (Math.random() - 0.5) * 0.12;
        p.vy = 0.08 + Math.random() * 0.10;
        p.vz = 0;
        p.life = 40;
        p.maxLife = 40;
        spawned++;
      }
    }
  }

  /**
   * Adds a cartoon red splat stain on the ring mat that fades after 10 sec (600 frames)
   */
  addMatSplat(x, z, scale = 0.38) {
    for (let i = 0; i < MAX_SPLATS; i++) {
      const s = this.splats[i];
      if (!s.active) {
        s.active = true;
        s.x = x;
        s.z = z;
        s.scale = scale;
        s.rotation = Math.random() * Math.PI * 2;
        s.life = SPLAT_DURATION;
        s.maxLife = SPLAT_DURATION;
        return;
      }
    }

    // Pool full: overwrite the one with lowest remaining life
    let lowestIdx = 0;
    let lowestLife = Infinity;
    for (let i = 0; i < MAX_SPLATS; i++) {
      if (this.splats[i].life < lowestLife) {
        lowestLife = this.splats[i].life;
        lowestIdx = i;
      }
    }
    const s = this.splats[lowestIdx];
    s.active = true;
    s.x = x;
    s.z = z;
    s.scale = scale;
    s.rotation = Math.random() * Math.PI * 2;
    s.life = SPLAT_DURATION;
    s.maxLife = SPLAT_DURATION;
  }

  /**
   * Connected directly to the game's hit event
   */
  onHit({ attacker, defender, hbX, hbY, isHeavy, isSuper, damage }) {
    const hitX = hbX;
    const hitY = hbY;
    const hitFacing = attacker ? attacker.facing : 1;

    if (isSuper) {
      // 1. CARTOON RED DROPLETS (#FF1A1A): 18-24 drops per super hit with gravity
      this.spawnParticles(hitX, hitY, 0, 20, COLOR_BLOOD, 'blood', 0.36);

      // 2. FLYING TOOTH: A white tooth flies out on every super hit!
      this.spawnParticles(hitX, hitY, 0, 1, COLOR_TOOTH, 'tooth', 0.38, {
        vx: -hitFacing * (0.09 + Math.random() * 0.05),
        vy: 0.19 + Math.random() * 0.05,
      });

      // 3. SWEAT: bright light-blue drops flying off the head
      if (defender) {
        this.spawnParticles(defender.x, defender.y + 1.8, 0, 10, COLOR_SWEAT, 'sweat', 0.26);
        defender.headSquashTimer = 16;
        defender.headSquashDirection = hitFacing;
        defender.dazedTicks = 60;
      }

      // Hit sparks & comic stars
      this.spawnParticles(hitX, hitY, 0, 20, COLOR_SPARK, 'spark', 0.45);
      this.spawnParticles(hitX, hitY, 0, 12, COLOR_BLOOD, 'star', 0.40);
    } else if (isHeavy) {
      // 1. CARTOON RED DROPLETS (#FF1A1A): 8-15 drops per heavy hit
      const dropCount = 10 + Math.floor(Math.random() * 6); // 10-15
      this.spawnParticles(hitX, hitY, 0, dropCount, COLOR_BLOOD, 'blood', 0.32);

      // 2. SWEAT: bright light-blue drops flying off the head on every hit
      if (defender) {
        this.spawnParticles(defender.x, defender.y + 1.8, 0, 8, COLOR_SWEAT, 'sweat', 0.24);
        defender.headSquashTimer = 12;
        defender.headSquashDirection = hitFacing;
      }

      // Sparks & stars
      this.spawnParticles(hitX, hitY, 0, 16, COLOR_SPARK, 'spark', 0.32);
      this.spawnParticles(hitX, hitY, 0, 8, COLOR_BLOOD, 'star', 0.28);
    } else {
      // Light hit: light-blue sweat drops off head on every hit
      if (defender) {
        this.spawnParticles(defender.x, defender.y + 1.6, 0, 6, COLOR_SWEAT, 'sweat', 0.20);
      }
      this.spawnParticles(hitX, hitY, 0, 10, COLOR_SPARK, 'spark', 0.18);
    }

    // Extra sweat during long combos (comboCount >= 3)
    if (defender && defender.comboCount >= 3) {
      this.spawnParticles(defender.x, defender.y + 1.8, 0, 6, COLOR_SWEAT, 'sweat', 0.22);
    }
  }

  /**
   * Updates fighter-specific visual effects (tears, sweat drip, face damage, dazed stars)
   */
  updateFighter(fighter, rig, state) {
    if (!fighter || !rig) return;

    const hpPct = fighter.maxHealth > 0 ? fighter.health / fighter.maxHealth : 1.0;

    // 1. Face damage texture redrawn as health drops (60% bruise, 40% black eye, 20% bleeding nose)
    let dmgLevel = 0;
    if (hpPct <= 0.20) dmgLevel = 3;
    else if (hpPct <= 0.40) dmgLevel = 2;
    else if (hpPct <= 0.60) dmgLevel = 1;

    if (rig.faceDamageCanvas && rig.faceDamageCtx && rig.faceDamageTexture) {
      if (rig.faceDamageLevel !== dmgLevel) {
        rig.faceDamageLevel = dmgLevel;
        drawFaceDamageCanvas(
          rig.faceDamageCtx,
          rig.faceDamageCanvas.width,
          rig.faceDamageCanvas.height,
          dmgLevel
        );
        rig.faceDamageTexture.needsUpdate = true;
      }
    }

    // Optional 3D face mesh overlays
    if (rig.bruiseMesh) rig.bruiseMesh.visible = dmgLevel >= 1;
    if (rig.blackEyeMesh) rig.blackEyeMesh.visible = dmgLevel >= 2;
    if (rig.bleedingNoseMesh) rig.bleedingNoseMesh.visible = dmgLevel >= 3;
    if (rig.eyebrowCutMesh) rig.eyebrowCutMesh.visible = dmgLevel >= 3;

    // 2. Sweat drops: below 50% health, skin gets wet shine & drops fall constantly
    if (hpPct < 0.50 && !fighter.isKo) {
      if (state && state.tick % 18 === 0) {
        this.spawnParticles(
          fighter.x + (Math.random() - 0.5) * 0.3,
          fighter.y + 1.75,
          0,
          1,
          COLOR_SWEAT,
          'sweat',
          0.20,
          { vx: (Math.random() - 0.5) * 0.04, vy: -0.04 }
        );
      }
    }

    // 3. Tears: below 20% health, blue streams from the eyes
    if (hpPct <= 0.20 && !fighter.isKo) {
      if (state && state.tick % 12 === 0) {
        const eyeOffset = fighter.facing * 0.16;
        this.spawnParticles(
          fighter.x + eyeOffset,
          fighter.y + 1.70,
          0.1,
          1,
          COLOR_TEAR,
          'tear',
          0.24,
          { vx: fighter.facing * 0.02, vy: -0.05 }
        );
      }
    }

    // 4. Tears on KO: big cartoon tears spraying sideways like fountains!
    if (fighter.isKo && state && state.tick % 4 === 0) {
      // Left and right fountain bursts
      this.spawnParticles(
        fighter.x - 0.12,
        fighter.y + 1.68,
        0.1,
        1,
        COLOR_TEAR,
        'tear',
        0.32,
        { vx: -0.15 - Math.random() * 0.05, vy: 0.16 + Math.random() * 0.04 }
      );
      this.spawnParticles(
        fighter.x + 0.12,
        fighter.y + 1.68,
        0.1,
        1,
        COLOR_TEAR,
        'tear',
        0.32,
        { vx: 0.15 + Math.random() * 0.05, vy: 0.16 + Math.random() * 0.04 }
      );
    }

    // 5. Dazed stars: circling stars over the head after a knockdown
    const isDazed = (fighter.dazedTicks && fighter.dazedTicks > 0) ||
      fighter.actionState === 'KNOCKDOWN' ||
      (fighter.wakeupTicks && fighter.wakeupTicks > 0);

    if (rig.dazedStarsGroup) {
      rig.dazedStarsGroup.visible = !!isDazed;
      if (isDazed) {
        rig.dazedStarsGroup.rotation.y += 0.14;
      }
    }
  }

  /**
   * Main per-frame physics & render update
   */
  update(dt, state, p1Rig, p2Rig) {
    // 1. Update active particles
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) {
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.particleInstanced.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      p.life--;
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.rotX += p.vRotX;
      p.rotY += p.vRotY;

      // Particle physics & gravity
      if (p.shape === 'blood') {
        p.vy -= 0.0075; // Cartoon gravity on red droplets

        // When droplet hits the mat (Y <= 0.04), it leaves a red splat on the mat!
        if (p.y <= 0.04 && p.vy < 0) {
          this.addMatSplat(p.x, p.z || (Math.random() - 0.5) * 0.6, p.size * (1.8 + Math.random() * 0.6));
          // Synchronize with state.bloodSplats if present
          if (state) {
            if (!state.bloodSplats) state.bloodSplats = [];
            if (state.bloodSplats.length < 50) {
              state.bloodSplats.push({
                x: p.x,
                z: p.z || (Math.random() - 0.5) * 0.6,
                scale: p.size * (1.8 + Math.random() * 0.6),
                rotation: Math.random() * Math.PI * 2,
                life: SPLAT_DURATION,
                maxLife: SPLAT_DURATION,
              });
            }
          }
          p.active = false;
          this.dummy.scale.set(0, 0, 0);
          this.dummy.updateMatrix();
          this.particleInstanced.setMatrixAt(i, this.dummy.matrix);
          continue;
        }
      } else if (p.shape === 'tooth') {
        p.vy -= 0.006;
        if (p.y <= 0.03 && p.vy < 0) {
          p.y = 0.03;
          p.vy = -p.vy * 0.35; // bounce on canvas
          p.vx *= 0.65;
        }
      } else if (p.shape === 'sweat') {
        p.vy -= 0.0045;
      } else if (p.shape === 'tear') {
        p.vy -= 0.0055;
      } else if (p.shape === 'breath') {
        p.vy += 0.0012;
        p.vx *= 0.96;
        p.size *= 1.02;
      } else {
        p.vy -= 0.003;
      }

      if (p.life <= 0) {
        p.active = false;
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.particleInstanced.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      // Render transform for this particle
      const lifeRatio = p.life / p.maxLife;
      const curScale = lifeRatio * p.size;
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.rotX, p.rotY, 0);

      // Tailored cartoon scales per particle type (prominent on small phones)
      if (p.shape === 'blood') {
        // Large cartoon droplets elongated along fall direction
        this.dummy.scale.set(curScale * 1.8, curScale * 2.6, curScale * 1.8);
      } else if (p.shape === 'tooth') {
        // High visibility white molar tooth
        this.dummy.scale.set(curScale * 2.4, curScale * 3.0, curScale * 1.8);
      } else if (p.shape === 'sweat') {
        this.dummy.scale.set(curScale * 1.5, curScale * 2.1, curScale * 1.5);
      } else if (p.shape === 'tear') {
        this.dummy.scale.set(curScale * 1.6, curScale * 2.3, curScale * 1.6);
      } else if (p.shape === 'breath') {
        this.dummy.scale.set(curScale * 2.6, curScale * 2.6, curScale * 2.6);
      } else {
        this.dummy.scale.set(curScale * 1.4, curScale * 1.4, curScale * 1.4);
      }

      this.dummy.updateMatrix();
      this.particleInstanced.setMatrixAt(i, this.dummy.matrix);
      this.particleInstanced.setColorAt(i, this.tempColor.setHex(p.color));
    }
    this.particleInstanced.instanceMatrix.needsUpdate = true;
    if (this.particleInstanced.instanceColor) {
      this.particleInstanced.instanceColor.needsUpdate = true;
    }

    // 2. Update mat blood splats (fading after 10 sec)
    for (let i = 0; i < MAX_SPLATS; i++) {
      const s = this.splats[i];
      if (!s.active) {
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.splatInstanced.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      s.life--;
      if (s.life <= 0) {
        s.active = false;
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.splatInstanced.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      // Fade out during the last 100 frames of the 10 seconds
      const fade = Math.min(1, s.life / 100);
      const curScale = s.scale * Math.max(0.01, fade);

      this.dummy.position.set(s.x, 0.015, s.z);
      this.dummy.rotation.set(0, s.rotation, 0);
      this.dummy.scale.set(curScale, 1, curScale);
      this.dummy.updateMatrix();
      this.splatInstanced.setMatrixAt(i, this.dummy.matrix);
    }
    this.splatInstanced.instanceMatrix.needsUpdate = true;

    // 3. Update character rigs
    if (state) {
      if (state.p1 && p1Rig) this.updateFighter(state.p1, p1Rig, state);
      if (state.p2 && p2Rig) this.updateFighter(state.p2, p2Rig, state);
    }
  }

  /**
   * Resets everything at the start of each round!
   */
  reset(p1Rig = null, p2Rig = null) {
    // Clear all particles
    this.dummy.scale.set(0, 0, 0);
    this.dummy.updateMatrix();

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles[i].active = false;
      this.particleInstanced.setMatrixAt(i, this.dummy.matrix);
    }
    this.particleInstanced.instanceMatrix.needsUpdate = true;

    // Clear all mat splats
    for (let i = 0; i < MAX_SPLATS; i++) {
      this.splats[i].active = false;
      this.splatInstanced.setMatrixAt(i, this.dummy.matrix);
    }
    this.splatInstanced.instanceMatrix.needsUpdate = true;

    // Reset character face damage & stars
    const rigs = [p1Rig, p2Rig].filter(Boolean);
    rigs.forEach(rig => {
      if (rig.faceDamageCanvas && rig.faceDamageCtx && rig.faceDamageTexture) {
        rig.faceDamageLevel = 0;
        drawFaceDamageCanvas(
          rig.faceDamageCtx,
          rig.faceDamageCanvas.width,
          rig.faceDamageCanvas.height,
          0
        );
        rig.faceDamageTexture.needsUpdate = true;
      }
      if (rig.bruiseMesh) rig.bruiseMesh.visible = false;
      if (rig.blackEyeMesh) rig.blackEyeMesh.visible = false;
      if (rig.bleedingNoseMesh) rig.bleedingNoseMesh.visible = false;
      if (rig.eyebrowCutMesh) rig.eyebrowCutMesh.visible = false;
      if (rig.dazedStarsGroup) rig.dazedStarsGroup.visible = false;
    });
  }

  /**
   * Spawns all visual effects at center of screen for the "TEST FX" button
   */
  triggerTestFx(centerX = 0, centerY = 1.0, state = null, p1 = null, p2 = null) {
    // 1. Cartoon red droplets (8-15 drops)
    this.spawnParticles(centerX, centerY, 0, 15, COLOR_BLOOD, 'blood', 0.38);

    // 2. Mat blood splats
    this.addMatSplat(centerX - 0.35, 0.1, 0.44);
    this.addMatSplat(centerX + 0.35, -0.1, 0.40);

    // 3. White flying tooth
    this.spawnParticles(centerX, centerY, 0.1, 1, COLOR_TOOTH, 'tooth', 0.42, {
      vx: 0.08,
      vy: 0.22,
    });

    // 4. Bright light-blue sweat drops
    this.spawnParticles(centerX, centerY + 0.3, 0, 8, COLOR_SWEAT, 'sweat', 0.28);

    // 5. Cartoon blue tears spraying sideways
    this.spawnParticles(centerX - 0.15, centerY + 0.2, 0, 4, COLOR_TEAR, 'tear', 0.32, {
      vx: -0.14,
      vy: 0.15,
    });
    this.spawnParticles(centerX + 0.15, centerY + 0.2, 0, 4, COLOR_TEAR, 'tear', 0.32, {
      vx: 0.14,
      vy: 0.15,
    });

    // 6. Mouth breath puff
    this.spawnParticles(centerX, centerY + 0.1, 0, 1, COLOR_BREATH, 'breath', 0.34);

    // 7. Activate dazed stars & face damage on fighters if present
    if (p1) {
      p1.headSquashTimer = 16;
      p1.dazedTicks = 180;
      p1.health = Math.round(p1.maxHealth * 0.20);
    }
    if (p2) {
      p2.headSquashTimer = 16;
      p2.dazedTicks = 180;
      p2.health = Math.round(p2.maxHealth * 0.20);
    }
  }
}

/**
 * Helper function for hit event connections in physics / engine
 */
export function triggerHitEffects(state, attacker, defender, activeHitbox, hbX, hbY, isHeavy, isSuper) {
  if (!state) return;

  const hitFacing = attacker ? attacker.facing : 1;

  if (isSuper) {
    // 1. CARTOON RED DROPLETS (#FF1A1A): 18-24 drops per super hit with gravity
    spawnStateParticles(state, hbX, hbY, 0, 20, COLOR_BLOOD, 'blood', 0.34);
    // 2. FLYING TOOTH: A white tooth flies out on super hits
    spawnStateParticles(state, hbX, hbY, 0, 1, COLOR_TOOTH, 'tooth', 0.36, {
      vx: -hitFacing * (0.09 + Math.random() * 0.05),
      vy: 0.18 + Math.random() * 0.06,
    });
    // 3. SWEAT: bright light-blue drops flying off the head
    spawnStateParticles(state, defender.x, defender.y + 1.8, 0, 10, COLOR_SWEAT, 'sweat', 0.25);
    // Sparks & stars
    spawnStateParticles(state, hbX, hbY, 0, 24, COLOR_SPARK, 'spark', 0.48);
    spawnStateParticles(state, hbX, hbY, 0, 14, COLOR_BLOOD, 'star', 0.42);

    defender.headSquashTimer = 16;
    defender.headSquashDirection = hitFacing;
    defender.dazedTicks = 60;
  } else if (isHeavy) {
    // 1. CARTOON RED DROPLETS (#FF1A1A): 8-15 drops per heavy hit
    const dropCount = 10 + Math.floor(Math.random() * 6); // 10-15 drops
    spawnStateParticles(state, hbX, hbY, 0, dropCount, COLOR_BLOOD, 'blood', 0.30);
    // 2. SWEAT: bright light-blue drops flying off the head on every hit
    spawnStateParticles(state, defender.x, defender.y + 1.8, 0, 8, COLOR_SWEAT, 'sweat', 0.22);
    // Sparks & stars
    spawnStateParticles(state, hbX, hbY, 0, 18, COLOR_SPARK, 'spark', 0.32);
    spawnStateParticles(state, hbX, hbY, 0, 8, COLOR_BLOOD, 'star', 0.28);

    defender.headSquashTimer = 12;
    defender.headSquashDirection = hitFacing;
  } else {
    // Light hit: light-blue sweat drops on every hit
    spawnStateParticles(state, hbX, hbY, 0, 10, COLOR_SPARK, 'spark', 0.16);
    spawnStateParticles(state, defender.x, defender.y + 1.6, 0, 5, COLOR_SWEAT, 'sweat', 0.18);
  }

  // Extra sweat during combos
  if (defender.comboCount >= 3) {
    spawnStateParticles(state, defender.x, defender.y + 1.8, 0, 6, COLOR_SWEAT, 'sweat', 0.22);
  }
}

/**
 * State particles helper adhering to MAX_PARTICLES pooling
 */
function spawnStateParticles(state, x, y, z, count, color, shape, baseSize, customVel = null) {
  if (!state.particles) state.particles = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (0.04 + Math.random() * 0.12) * (baseSize > 0.25 ? 1.35 : 1.0);

    let vx = Math.cos(angle) * speed;
    let vy = Math.sin(angle) * speed + 0.03;
    let vz = (Math.random() - 0.5) * 0.05;
    let life = 20 + Math.floor(Math.random() * 15);
    let maxLife = 35;

    if (shape === 'blood') {
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
      vx = customVel?.vx ?? (Math.random() - 0.5) * 0.09;
      vy = customVel?.vy ?? (0.05 + Math.random() * 0.08);
      vz = (Math.random() - 0.5) * 0.06;
      life = 25 + Math.floor(Math.random() * 12);
      maxLife = 37;
    } else if (shape === 'tear') {
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

    state.particles.push({
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
    });
  }

  if (state.particles.length > MAX_PARTICLES) {
    state.particles = state.particles.slice(-MAX_PARTICLES);
  }
}
