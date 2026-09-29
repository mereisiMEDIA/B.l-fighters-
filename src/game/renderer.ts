import * as THREE from 'three';
import {
  BloodSplat,
  FighterConfig,
  FighterState,
  GameState,
  ParticleEffect,
  Projectile,
} from '../types/game';
import { ArenaEnvironment } from './arena.js';
import { VisualEffectsSystem, drawFaceDamageCanvas } from './effects.js';

interface CharacterRig {
  root: THREE.Group;
  bodyMesh: THREE.Group;
  // Hierarchical Joint Groups
  hips: THREE.Group;
  spine: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  faceGroup: THREE.Group;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  leftPupil: THREE.Mesh;
  rightPupil: THREE.Mesh;
  jaw: THREE.Mesh;
  mouthMesh?: THREE.Mesh;
  noseMesh?: THREE.Mesh;
  leftEyebrow?: THREE.Mesh;
  rightEyebrow?: THREE.Mesh;
  // Arm Joints (Shoulders, Elbows, Wrists, Hands)
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  leftWrist: THREE.Group;
  leftHand: THREE.Group;
  leftGloveMesh: THREE.Mesh;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  rightWrist: THREE.Group;
  rightHand: THREE.Group;
  rightGloveMesh: THREE.Mesh;
  // Leg Joints (Hips, Knees, Ankles, Feet)
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  leftAnkle: THREE.Group;
  leftFoot: THREE.Group;
  leftBootMesh: THREE.Mesh;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  rightAnkle: THREE.Group;
  rightFoot: THREE.Group;
  rightBootMesh: THREE.Mesh;
  // Props & Custom Fighter Meshes
  toolBeltMesh?: THREE.Group;
  wrenchProp?: THREE.Group;
  drillProp?: THREE.Group;
  serviceVanProp?: THREE.Group;
  serviceVanWheels?: THREE.Mesh[];
  serviceVanHeadlights?: THREE.Mesh[];
  excavatorProp?: THREE.Group;
  excavatorArm?: THREE.Group;
  excavatorBucket?: THREE.Group;
  pinkAura?: THREE.Mesh;
  carDoorProp?: THREE.Group;
  whiteCarProp?: THREE.Group;
  chainMesh?: THREE.Group | THREE.Mesh;
  pendantMesh?: THREE.Group | THREE.Mesh;
  linoyRageAura?: THREE.Mesh;
  steamEarsGroup?: THREE.Group;
  electricWiresProp?: THREE.Group;
  overclockChipProp?: THREE.Group;
  circuitBoardOverlay?: THREE.Group;
  glassesGlowMesh?: THREE.Mesh;
  phone3DProp?: THREE.Group;
  phonePopupMesh?: THREE.Mesh;
  phoneCallTexture?: THREE.CanvasTexture;
  phoneWhereTexture?: THREE.CanvasTexture;
  phoneMissedTexture?: THREE.CanvasTexture;
  fatalErrorScreen?: THREE.Group;
  xraySkeletonMesh?: THREE.Group;
  earSmokeGroup?: THREE.Group;
  hairGroup?: THREE.Group;
  // Matthew Props & Custom Meshes
  doorProp?: THREE.Group;
  pitaProp?: THREE.Group;
  shawarmaProp?: THREE.Group;
  mathFormulasProp?: THREE.Group;
  sleepZzzBubble?: THREE.Group;
  // Progressive Damage & Visual FX
  skinMaterials: THREE.MeshToonMaterial[];
  bruiseMesh?: THREE.Mesh;
  blackEyeMesh?: THREE.Mesh;
  bleedingNoseMesh?: THREE.Mesh;
  eyebrowCutMesh?: THREE.Mesh;
  faceDamageDecal?: THREE.Mesh;
  faceDamageCanvas?: HTMLCanvasElement;
  faceDamageCtx?: CanvasRenderingContext2D;
  faceDamageTexture?: THREE.CanvasTexture;
  faceDamageLevel?: number;
  dazedStarsGroup?: THREE.Group;
  tearStreamsGroup?: THREE.Group;
}

export class GameRenderer {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private p1Rig!: CharacterRig;
  private p2Rig!: CharacterRig;
  private currentP1Id: string = '';
  private currentP2Id: string = '';
  public arena!: ArenaEnvironment;
  public effects!: VisualEffectsSystem;
  private particleMeshes: THREE.InstancedMesh | null = null;
  private particleDummy = new THREE.Object3D();
  private splatMeshes: THREE.InstancedMesh | null = null;
  private splatDummy = new THREE.Object3D();
  private tempParticleColor = new THREE.Color();
  private toonGradientMap: THREE.CanvasTexture;
  private projectilesContainer = new THREE.Group();
  private ductTapeMeshMap = new Map<string, THREE.Group>();
  private occludableArenaMeshes: THREE.Mesh[] = [];
  private raycaster = new THREE.Raycaster();

  // Matthew Cinematic Super Props
  private matthewDoor1Group!: THREE.Group;
  private matthewDoor2Group!: THREE.Group;
  private matthewDoor3Group!: THREE.Group;
  private matthewReceiptProp!: THREE.Group;
  private matthewShawarmaGroup!: THREE.Group;
  private matthewCraterGroup!: THREE.Group;

  // K.O. Animation System 3D Props
  private dandanKoGroup!: THREE.Group;
  private dandanGhostSprite!: THREE.Sprite;
  private dandanToolMeshes: THREE.Mesh[] = [];
  private moshonKoGroup!: THREE.Group;
  private moshonGlassesMesh!: THREE.Group;
  private moshonPhoneGroup!: THREE.Group;
  private moshonPhonePopupMesh!: THREE.Mesh;
  private moshonGhostSprite!: THREE.Sprite;
  private moshonTetherMesh!: THREE.Line;
  private matthewKoGroup!: THREE.Group;
  private matthewKoCraterDecal!: THREE.Mesh;
  private matthewZzzSprite!: THREE.Sprite;
  private defaultKoGroup!: THREE.Group;
  private defaultKoStars: THREE.Mesh[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.toonGradientMap = this.createToonGradientMap();

    // 1. Scene setup (Sunset in an Israeli neighborhood)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x312e81); // Sunset twilight indigo sky base
    // Soft atmospheric haze
    this.scene.fog = new THREE.FogExp2(0x7c2d12, 0.012);

    // 2. Camera setup (perpendicular side-view, pulled back comfortably)
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(0, 1.8, 10.5);

    // 3. Renderer setup with soft shadows
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    container.appendChild(this.renderer.domElement);

    // 4. Build Israeli Neighborhood Sunset Arena & Neighbors Crowd
    this.arena = new ArenaEnvironment(this.scene);
    if (this.arena.occludableMeshes) {
      this.arena.occludableMeshes.forEach((m) => this.registerOccludable(m));
    }

    // 5. Setup Complete Visual Effects System (effects.js)
    this.effects = new VisualEffectsSystem(this.scene);
    this.setupParticleSystem();

    // 6. Add Projectiles Container
    this.scene.add(this.projectilesContainer);

    // 7. Initialize Matthew's Level 2 & 3 Cinematic Props
    this.createMatthewDoorProps();
    this.createMatthewSleepingGiantProps();

    // 8. Initialize K.O. Animation System Visual Props
    this.createKoProps();

    // 9. Handle Window Resize
    window.addEventListener('resize', this.onResize);
  }

  public onResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  /**
   * 3-Tone stepped gradient texture for cartoon cel/toon shading
   */
  private createToonGradientMap(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#555555';
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = '#999999';
    ctx.fillRect(1, 0, 1, 1);
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(2, 0, 1, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 0, 1, 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    return texture;
  }

  /**
   * Helper to create a cartoon Toon Material with outline
   */
  private createToonMat(color: number, roughness = 0.5): THREE.MeshToonMaterial {
    return new THREE.MeshToonMaterial({
      color,
      gradientMap: this.toonGradientMap,
      bumpScale: 0.05,
    });
  }

  /**
   * Adds an inverted-hull black cartoon outline to a mesh
   */
  private addOutline(mesh: THREE.Mesh, thickness = 1.07) {
    const outlineMat = new THREE.MeshBasicMaterial({
      color: 0x05060f,
      side: THREE.BackSide,
      transparent: true,
      opacity: 1.0,
    });
    const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMat);
    outlineMesh.scale.set(thickness, thickness, thickness);
    mesh.add(outlineMesh);
  }

  /**
   * Builds 3D Doors and Receipt for Matthew Level 2 Super: "DOOR-TO-DOOR SALES"
   */
  private createMatthewDoorProps() {
    // 1. Wooden Door
    this.matthewDoor1Group = new THREE.Group();
    const woodMat = this.createToonMat(0x854d0e);
    const frameMat = this.createToonMat(0x57300a);
    const knobMat = this.createToonMat(0xfacc15);

    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.3, 0.12), frameMat);
    postL.position.set(-0.55, 1.15, 0);
    this.addOutline(postL, 1.05);
    this.matthewDoor1Group.add(postL);

    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.3, 0.12), frameMat);
    postR.position.set(0.55, 1.15, 0);
    this.addOutline(postR, 1.05);
    this.matthewDoor1Group.add(postR);

    const topHeader = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.12), frameMat);
    topHeader.position.set(0, 2.3, 0);
    this.addOutline(topHeader, 1.05);
    this.matthewDoor1Group.add(topHeader);

    // Intact Wooden Door Slab
    const door1Slab = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.2, 0.06), woodMat);
    door1Slab.position.set(0, 1.1, 0);
    door1Slab.name = 'doorSlab';
    this.addOutline(door1Slab, 1.05);
    this.matthewDoor1Group.add(door1Slab);

    // Brass round knob
    const knob1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), knobMat);
    knob1.position.set(0.38, 1.05, 0.05);
    door1Slab.add(knob1);

    // Splinters group (hidden initially, shown when broken)
    const splintersGroup = new THREE.Group();
    splintersGroup.name = 'splinters';
    splintersGroup.visible = false;
    for (let i = 0; i < 8; i++) {
      const splinter = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45 + (i % 3) * 0.15, 0.04), woodMat);
      splinter.position.set((Math.random() - 0.5) * 0.8, 0.6 + Math.random() * 1.1, (Math.random() - 0.5) * 0.3);
      splinter.rotation.set(Math.random() * 0.8, Math.random() * 0.8, (Math.random() - 0.5) * 1.5);
      this.addOutline(splinter, 1.05);
      splintersGroup.add(splinter);
    }
    this.matthewDoor1Group.add(splintersGroup);
    this.matthewDoor1Group.visible = false;
    this.scene.add(this.matthewDoor1Group);

    // 2. Steel Door
    this.matthewDoor2Group = new THREE.Group();
    const steelMat = this.createToonMat(0x64748b);
    const steelFrameMat = this.createToonMat(0x334155);
    const handleMat = this.createToonMat(0x94a3b8);

    const sPostL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 0.14), steelFrameMat);
    sPostL.position.set(-0.55, 1.15, 0);
    this.addOutline(sPostL, 1.05);
    this.matthewDoor2Group.add(sPostL);

    const sPostR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 0.14), steelFrameMat);
    sPostR.position.set(0.55, 1.15, 0);
    this.addOutline(sPostR, 1.05);
    this.matthewDoor2Group.add(sPostR);

    const sTopHeader = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.12, 0.14), steelFrameMat);
    sTopHeader.position.set(0, 2.3, 0);
    this.addOutline(sTopHeader, 1.05);
    this.matthewDoor2Group.add(sTopHeader);

    // Intact Steel Door Slab
    const door2Slab = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.2, 0.08), steelMat);
    door2Slab.position.set(0, 1.1, 0);
    door2Slab.name = 'doorSlab';
    this.addOutline(door2Slab, 1.05);
    this.matthewDoor2Group.add(door2Slab);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.06), handleMat);
    handle.position.set(0.35, 1.05, 0.06);
    door2Slab.add(handle);

    // Broken steel debris
    const steelDebris = new THREE.Group();
    steelDebris.name = 'steelDebris';
    steelDebris.visible = false;
    for (let i = 0; i < 6; i++) {
      const piece = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.45, 0.06), steelMat);
      piece.position.set((Math.random() - 0.5) * 0.9, 0.5 + Math.random() * 1.1, (Math.random() - 0.5) * 0.4);
      piece.rotation.set((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.5);
      this.addOutline(piece, 1.05);
      steelDebris.add(piece);
    }
    this.matthewDoor2Group.add(steelDebris);
    this.matthewDoor2Group.visible = false;
    this.scene.add(this.matthewDoor2Group);

    // 3. Armored Security Door
    this.matthewDoor3Group = new THREE.Group();
    const armorMat = this.createToonMat(0x0f172a);
    const vaultFrameMat = this.createToonMat(0x1e293b);
    const hazardMat = this.createToonMat(0xfacc15);

    const vPostL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.35, 0.18), vaultFrameMat);
    vPostL.position.set(-0.58, 1.15, 0);
    this.addOutline(vPostL, 1.05);
    this.matthewDoor3Group.add(vPostL);

    const vPostR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.35, 0.18), vaultFrameMat);
    vPostR.position.set(0.58, 1.15, 0);
    this.addOutline(vPostR, 1.05);
    this.matthewDoor3Group.add(vPostR);

    const vHeader = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.16, 0.18), vaultFrameMat);
    vHeader.position.set(0, 2.35, 0);
    this.addOutline(vHeader, 1.05);
    this.matthewDoor3Group.add(vHeader);

    // Armored Door Slab (can tip over and fall flat on opponent)
    const door3Slab = new THREE.Group();
    door3Slab.name = 'armoredSlab';

    const armorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.2, 0.12), armorMat);
    armorPanel.position.set(0, 1.1, 0);
    this.addOutline(armorPanel, 1.05);
    door3Slab.add(armorPanel);

    // Hazard yellow caution trim
    const hazardTop = new THREE.Mesh(new THREE.BoxGeometry(1.03, 0.08, 0.13), hazardMat);
    hazardTop.position.set(0, 2.12, 0);
    door3Slab.add(hazardTop);

    const hazardBtm = new THREE.Mesh(new THREE.BoxGeometry(1.03, 0.08, 0.13), hazardMat);
    hazardBtm.position.set(0, 0.08, 0);
    door3Slab.add(hazardBtm);

    // Vault Wheel in Center
    const wheelMat = this.createToonMat(0x94a3b8);
    const wheelMesh = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 24), wheelMat);
    wheelMesh.position.set(0.2, 1.1, 0.07);
    door3Slab.add(wheelMesh);

    this.matthewDoor3Group.add(door3Slab);
    this.matthewDoor3Group.visible = false;
    this.scene.add(this.matthewDoor3Group);

    // 4. Receipt Prop
    this.matthewReceiptProp = new THREE.Group();
    const paperMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const receiptPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.38), paperMat);
    receiptPlane.rotation.x = -Math.PI / 2.5;
    this.matthewReceiptProp.add(receiptPlane);
    this.matthewReceiptProp.visible = false;
    this.scene.add(this.matthewReceiptProp);
  }

  /**
   * Builds Giant Shawarma and Crater for Matthew Level 3 Super: "THE SLEEPING GIANT"
   */
  private createMatthewSleepingGiantProps() {
    // 1. Giant Floating Shawarma
    this.matthewShawarmaGroup = new THREE.Group();
    const rodMat = this.createToonMat(0x94a3b8);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 16), rodMat);
    this.matthewShawarmaGroup.add(rod);

    const meatMat = this.createToonMat(0x92400e);
    const meatCone = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.25, 1.35, 24), meatMat);
    meatCone.position.set(0, 0.15, 0);
    this.addOutline(meatCone, 1.05);
    this.matthewShawarmaGroup.add(meatCone);

    const tomato = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), this.createToonMat(0xef4444));
    tomato.position.set(0, 0.95, 0);
    this.matthewShawarmaGroup.add(tomato);

    const pita = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 24), this.createToonMat(0xfde68a));
    pita.position.set(0, 0.83, 0);
    this.matthewShawarmaGroup.add(pita);

    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 32), haloMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.set(0, 1.25, 0);
    this.matthewShawarmaGroup.add(halo);

    this.matthewShawarmaGroup.visible = false;
    this.scene.add(this.matthewShawarmaGroup);

    // 2. 3D Floor Crater Decal
    this.matthewCraterGroup = new THREE.Group();
    const craterMat = this.createToonMat(0x0f172a);
    const craterBase = new THREE.Mesh(new THREE.CircleGeometry(1.65, 32), craterMat);
    craterBase.rotation.x = -Math.PI / 2;
    craterBase.position.y = 0.015;
    this.matthewCraterGroup.add(craterBase);

    const deepPit = new THREE.Mesh(new THREE.CircleGeometry(0.95, 24), this.createToonMat(0x020617));
    deepPit.rotation.x = -Math.PI / 2;
    deepPit.position.y = 0.018;
    this.matthewCraterGroup.add(deepPit);

    const rockMat = this.createToonMat(0x334155);
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dist = 1.1 + (i % 3) * 0.2;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + (i % 2) * 0.06), rockMat);
      rock.position.set(Math.cos(angle) * dist, 0.06, Math.sin(angle) * dist * 0.5);
      rock.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
      this.addOutline(rock, 1.05);
      this.matthewCraterGroup.add(rock);
    }

    this.matthewCraterGroup.visible = false;
    this.scene.add(this.matthewCraterGroup);
  }

  /**
   * Updates Matthew Cinematic Super 3D visual props and effects
   */
  private updateMatthewCinematicVisuals(state: GameState) {
    // 1. Level 2: DOOR-TO-DOOR SALES
    if (state.matthewDoorSuper) {
      const ds = state.matthewDoorSuper;
      // Door 1
      this.matthewDoor1Group.visible = ds.door1Visible ?? false;
      this.matthewDoor1Group.position.set(ds.door1X, 0, 0);
      const d1Slab = this.matthewDoor1Group.getObjectByName('doorSlab');
      const d1Splinters = this.matthewDoor1Group.getObjectByName('splinters');
      if (d1Slab) d1Slab.visible = !ds.door1Broken;
      if (d1Splinters) d1Splinters.visible = ds.door1Broken;

      // Door 2
      this.matthewDoor2Group.visible = ds.door2Visible ?? false;
      this.matthewDoor2Group.position.set(ds.door2X, 0, 0);
      const d2Slab = this.matthewDoor2Group.getObjectByName('doorSlab');
      const d2Debris = this.matthewDoor2Group.getObjectByName('steelDebris');
      if (d2Slab) d2Slab.visible = !ds.door2Broken;
      if (d2Debris) d2Debris.visible = ds.door2Broken;

      // Door 3
      this.matthewDoor3Group.visible = ds.door3Visible ?? false;
      this.matthewDoor3Group.position.set(ds.door3X, 0, 0);
      const d3Slab = this.matthewDoor3Group.getObjectByName('armoredSlab');
      if (d3Slab) {
        if (ds.door3Fallen) {
          // Falls flat on floor forward, squashing opponent
          d3Slab.rotation.x = Math.PI / 2;
          d3Slab.position.set(0, 0.04, 0);
        } else {
          d3Slab.rotation.x = 0;
          d3Slab.position.set(0, 0, 0);
        }
      }

      // Receipt Prop
      if (ds.receiptGiven) {
        this.matthewReceiptProp.visible = true;
        this.matthewReceiptProp.position.set(state.p1.facing === 1 ? ds.door3X - 0.2 : ds.door3X + 0.2, 0.2, 0.1);
      } else {
        this.matthewReceiptProp.visible = false;
      }
    } else {
      this.matthewDoor1Group.visible = false;
      this.matthewDoor2Group.visible = false;
      this.matthewDoor3Group.visible = false;
      this.matthewReceiptProp.visible = false;
    }

    // 2. Level 3: THE SLEEPING GIANT
    if (state.matthewSleepSuper) {
      const ss = state.matthewSleepSuper;

      // Shawarma
      if (ss.shawarmaVisible) {
        this.matthewShawarmaGroup.visible = true;
        this.matthewShawarmaGroup.position.set(ss.craterX, ss.shawarmaY, 0);
        this.matthewShawarmaGroup.rotation.y += 0.025;
      } else {
        this.matthewShawarmaGroup.visible = false;
      }

      // Crater
      if (ss.craterVisible) {
        this.matthewCraterGroup.visible = true;
        this.matthewCraterGroup.position.set(ss.craterX, 0.015, 0);
      } else {
        this.matthewCraterGroup.visible = false;
      }
    } else {
      this.matthewShawarmaGroup.visible = false;
      this.matthewCraterGroup.visible = false;
    }
  }

  /**
   * Initializes 3D props and visual effects for the K.O. Animation System
   */
  private createKoProps() {
    // 1. DANDAN K.O. PROPS (Dart nose stuck, falling tools, ghost with "It wasn't me...")
    this.dandanKoGroup = new THREE.Group();

    // Tools falling off belt one by one
    const wrenchMat = this.createToonMat(0x94a3b8);
    const wrenchGeo = new THREE.BoxGeometry(0.12, 0.45, 0.04);
    const wrenchMesh = new THREE.Mesh(wrenchGeo, wrenchMat);
    this.addOutline(wrenchMesh, 1.05);
    wrenchMesh.visible = false;
    this.dandanToolMeshes.push(wrenchMesh);
    this.dandanKoGroup.add(wrenchMesh);

    const sdriverMat = this.createToonMat(0xfacc15);
    const sdriverGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.40, 8);
    const sdriverMesh = new THREE.Mesh(sdriverGeo, sdriverMat);
    this.addOutline(sdriverMesh, 1.05);
    sdriverMesh.visible = false;
    this.dandanToolMeshes.push(sdriverMesh);
    this.dandanKoGroup.add(sdriverMesh);

    const tapeMat = this.createToonMat(0x334155);
    const tapeGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.12, 16);
    const tapeMesh = new THREE.Mesh(tapeGeo, tapeMat);
    this.addOutline(tapeMesh, 1.05);
    tapeMesh.visible = false;
    this.dandanToolMeshes.push(tapeMesh);
    this.dandanKoGroup.add(tapeMesh);

    const hammerMat = this.createToonMat(0x78350f);
    const hammerGeo = new THREE.BoxGeometry(0.10, 0.42, 0.06);
    const hammerMesh = new THREE.Mesh(hammerGeo, hammerMat);
    this.addOutline(hammerMesh, 1.05);
    hammerMesh.visible = false;
    this.dandanToolMeshes.push(hammerMesh);
    this.dandanKoGroup.add(hammerMesh);

    // Dandan Ghost Sprite with speech bubble: "It wasn't me..."
    const dandanGhostCanvas = document.createElement('canvas');
    dandanGhostCanvas.width = 384;
    dandanGhostCanvas.height = 384;
    const dctx = dandanGhostCanvas.getContext('2d')!;
    this.drawDandanGhost(dctx);
    const dandanGhostTex = new THREE.CanvasTexture(dandanGhostCanvas);
    const dandanGhostMat = new THREE.SpriteMaterial({
      map: dandanGhostTex,
      transparent: true,
      depthWrite: false,
    });
    this.dandanGhostSprite = new THREE.Sprite(dandanGhostMat);
    this.dandanGhostSprite.scale.set(2.4, 2.4, 1);
    this.dandanGhostSprite.visible = false;
    this.dandanKoGroup.add(this.dandanGhostSprite);

    this.dandanKoGroup.visible = false;
    this.scene.add(this.dandanKoGroup);

    // 2. MOSHON K.O. PROPS (Glasses flying off, phone ringing "LINOY CALLING", ghost pulled back)
    this.moshonKoGroup = new THREE.Group();

    // 3D Glasses
    this.moshonGlassesMesh = new THREE.Group();
    const glassFrameMat = this.createToonMat(0x0f172a);
    const glassLensMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.75 });
    const gFrame1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.03), glassFrameMat);
    gFrame1.position.set(-0.14, 0, 0);
    const gLens1 = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.01), glassLensMat);
    gLens1.position.set(-0.14, 0, 0.015);
    const gFrame2 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.03), glassFrameMat);
    gFrame2.position.set(0.14, 0, 0);
    const gLens2 = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.01), glassLensMat);
    gLens2.position.set(0.14, 0, 0.015);
    const gBridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.02), glassFrameMat);
    this.moshonGlassesMesh.add(gFrame1, gLens1, gFrame2, gLens2, gBridge);
    this.moshonGlassesMesh.visible = false;
    this.moshonKoGroup.add(this.moshonGlassesMesh);

    // 3D Smartphone
    this.moshonPhoneGroup = new THREE.Group();
    const phoneBodyMat = this.createToonMat(0x18181b);
    const phoneBody = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.50, 0.04), phoneBodyMat);
    this.addOutline(phoneBody, 1.05);
    this.moshonPhoneGroup.add(phoneBody);

    // Phone Screen: "LINOY CALLING"
    const phoneCallCanvas = document.createElement('canvas');
    phoneCallCanvas.width = 256;
    phoneCallCanvas.height = 384;
    const pctx = phoneCallCanvas.getContext('2d')!;
    this.drawPhoneCallScreen(pctx);
    const phoneCallTex = new THREE.CanvasTexture(phoneCallCanvas);
    const phoneScreenMat = new THREE.MeshBasicMaterial({ map: phoneCallTex });
    const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.46), phoneScreenMat);
    phoneScreen.position.set(0, 0, 0.025);
    this.moshonPhoneGroup.add(phoneScreen);

    // Ringing popup card floating above phone
    const phonePopupCanvas = document.createElement('canvas');
    phonePopupCanvas.width = 384;
    phonePopupCanvas.height = 160;
    const ppctx = phonePopupCanvas.getContext('2d')!;
    this.drawPhoneCallPopup(ppctx);
    const phonePopupTex = new THREE.CanvasTexture(phonePopupCanvas);
    const phonePopupMat = new THREE.MeshBasicMaterial({ map: phonePopupTex, transparent: true });
    this.moshonPhonePopupMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.68), phonePopupMat);
    this.moshonPhonePopupMesh.position.set(0, 0.65, 0.1);
    this.moshonPhoneGroup.add(this.moshonPhonePopupMesh);

    this.moshonPhoneGroup.visible = false;
    this.moshonKoGroup.add(this.moshonPhoneGroup);

    // Moshon Ghost Sprite
    const moshonGhostCanvas = document.createElement('canvas');
    moshonGhostCanvas.width = 384;
    moshonGhostCanvas.height = 384;
    const mctx = moshonGhostCanvas.getContext('2d')!;
    this.drawMoshonGhost(mctx);
    const moshonGhostTex = new THREE.CanvasTexture(moshonGhostCanvas);
    const moshonGhostMat = new THREE.SpriteMaterial({
      map: moshonGhostTex,
      transparent: true,
      depthWrite: false,
    });
    this.moshonGhostSprite = new THREE.Sprite(moshonGhostMat);
    this.moshonGhostSprite.scale.set(2.4, 2.4, 1);
    this.moshonGhostSprite.visible = false;
    this.moshonKoGroup.add(this.moshonGhostSprite);

    // Tether pull line
    const tetherGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 1.5, 0),
    ]);
    const tetherMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3, transparent: true, opacity: 0.85 });
    this.moshonTetherMesh = new THREE.Line(tetherGeo, tetherMat);
    this.moshonTetherMesh.visible = false;
    this.moshonKoGroup.add(this.moshonTetherMesh);

    this.moshonKoGroup.visible = false;
    this.scene.add(this.moshonKoGroup);

    // 3. MATTHEW K.O. PROPS (Floor crater, "Zzz" bubbles, "Finally, a nap...")
    this.matthewKoGroup = new THREE.Group();

    // Matthew small impact crater
    const mCraterMat = this.createToonMat(0x0f172a);
    this.matthewKoCraterDecal = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), mCraterMat);
    this.matthewKoCraterDecal.rotation.x = -Math.PI / 2;
    this.matthewKoCraterDecal.position.y = 0.015;
    this.matthewKoGroup.add(this.matthewKoCraterDecal);

    // Snoring Zzz & thought bubble
    const matthewZzzCanvas = document.createElement('canvas');
    matthewZzzCanvas.width = 384;
    matthewZzzCanvas.height = 384;
    const mzctx = matthewZzzCanvas.getContext('2d')!;
    this.drawMatthewZzz(mzctx);
    const matthewZzzTex = new THREE.CanvasTexture(matthewZzzCanvas);
    const matthewZzzMat = new THREE.SpriteMaterial({
      map: matthewZzzTex,
      transparent: true,
      depthWrite: false,
    });
    this.matthewZzzSprite = new THREE.Sprite(matthewZzzMat);
    this.matthewZzzSprite.scale.set(2.4, 2.4, 1);
    this.matthewKoGroup.add(this.matthewZzzSprite);

    this.matthewKoGroup.visible = false;
    this.scene.add(this.matthewKoGroup);

    // 4. DEFAULT FIGHTER K.O. PROPS (Circling yellow cartoon stars)
    this.defaultKoGroup = new THREE.Group();
    const starMat = this.createToonMat(0xfacc15);
    for (let i = 0; i < 5; i++) {
      const starGeo = new THREE.DodecahedronGeometry(0.11);
      const star = new THREE.Mesh(starGeo, starMat);
      this.addOutline(star, 1.08);
      this.defaultKoStars.push(star);
      this.defaultKoGroup.add(star);
    }
    this.defaultKoGroup.visible = false;
    this.scene.add(this.defaultKoGroup);
  }

  private drawDandanGhost(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, 384, 384);
    // Glowing white cartoon ghost body
    ctx.save();
    ctx.fillStyle = 'rgba(240, 249, 255, 0.88)';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.arc(140, 160, 58, Math.PI, 0); // Head dome
    ctx.lineTo(198, 250);
    // Wavy ghost tail
    ctx.bezierCurveTo(180, 275, 165, 245, 140, 270);
    ctx.bezierCurveTo(120, 245, 100, 275, 82, 250);
    ctx.closePath();
    ctx.fill();

    // Dandan's long pointy nose
    ctx.fillStyle = '#7A4A2E';
    ctx.beginPath();
    ctx.moveTo(140, 155);
    ctx.lineTo(215, 165);
    ctx.lineTo(140, 178);
    ctx.closePath();
    ctx.fill();

    // Cartoon closed squinting eyes & arched brows
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(115, 148, 12, 0, Math.PI, true); // left eye
    ctx.arc(155, 148, 12, 0, Math.PI, true); // right eye
    ctx.stroke();

    // Eyebrows
    ctx.beginPath();
    ctx.moveTo(102, 130);
    ctx.lineTo(128, 136);
    ctx.moveTo(144, 136);
    ctx.lineTo(170, 130);
    ctx.stroke();

    // Speech bubble: "It wasn't me..."
    ctx.restore();
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;

    // Bubble round rect
    const bx = 160, by = 45, bw = 210, bh = 72, r = 18;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + bw - r, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    ctx.lineTo(bx + 50, by + bh);
    ctx.lineTo(bx + 25, by + bh + 22); // tail
    ctx.lineTo(bx + 35, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px "Bungee", "Chango", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText("It wasn't me...", bx + bw / 2, by + bh / 2);
    ctx.restore();
  }

  private drawPhoneCallScreen(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, 256, 384);

    // Glowing red incoming banner
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(16, 24, 224, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('INCOMING CALL', 128, 55);

    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('LINOY ❤️', 128, 90);

    // Animated call buttons
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(68, 300, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(188, 300, 36, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPhoneCallPopup(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, 384, 160);
    // Comic popup box
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.fillRect(12, 12, 360, 136);
    ctx.strokeRect(12, 12, 360, 136);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'black 32px "Bungee", "Russo One", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 8;
    ctx.fillText('📱 LINOY CALLING! 📱', 192, 80);
  }

  private drawMoshonGhost(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, 384, 384);
    // Translucent light-blue ghost with glasses
    ctx.save();
    ctx.fillStyle = 'rgba(186, 230, 253, 0.85)';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18;

    ctx.beginPath();
    ctx.arc(192, 160, 60, Math.PI, 0);
    ctx.lineTo(252, 260);
    ctx.bezierCurveTo(230, 285, 210, 255, 192, 280);
    ctx.bezierCurveTo(174, 255, 154, 285, 132, 260);
    ctx.closePath();
    ctx.fill();

    // Glasses on ghost
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;
    ctx.strokeRect(150, 140, 36, 26);
    ctx.strokeRect(198, 140, 36, 26);
    ctx.beginPath();
    ctx.moveTo(186, 153);
    ctx.lineTo(198, 153);
    ctx.stroke();

    // Shocked ghost mouth (O)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(192, 195, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawMatthewZzz(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, 384, 384);

    // Thought Cloud: "Finally, a nap..."
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;

    const cx = 200, cy = 110;
    ctx.beginPath();
    ctx.arc(cx - 60, cy, 40, 0, Math.PI * 2);
    ctx.arc(cx, cy - 25, 48, 0, Math.PI * 2);
    ctx.arc(cx + 65, cy, 40, 0, Math.PI * 2);
    ctx.arc(cx + 35, cy + 30, 35, 0, Math.PI * 2);
    ctx.arc(cx - 35, cy + 30, 35, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Thought cloud bubbles
    ctx.beginPath();
    ctx.arc(cx - 75, cy + 90, 14, 0, Math.PI * 2);
    ctx.arc(cx - 95, cy + 130, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px "Bungee", "Russo One", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Finally, a nap...', cx, cy);

    // Floating cartoon "Zzz"
    ctx.font = 'black 48px "Bungee", Impact, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 3;
    ctx.strokeText('Zzz', 90, 280);
    ctx.fillText('Zzz', 90, 280);
    ctx.font = 'black 32px "Bungee", Impact, sans-serif';
    ctx.strokeText('Z', 60, 330);
    ctx.fillText('Z', 60, 330);
    ctx.restore();
  }

  /**
   * Updates dynamic 3D visual props and effects during the K.O. sequence
   */
  private updateKoVisuals(state: GameState) {
    if (!state.koSequenceTicks || state.koSequenceTicks <= 0 || !state.koLoserIndex) {
      this.dandanKoGroup.visible = false;
      this.moshonKoGroup.visible = false;
      this.matthewKoGroup.visible = false;
      this.defaultKoGroup.visible = false;
      return;
    }

    const loser = state.koLoserIndex === 1 ? state.p1 : state.p2;
    const koAnimType = loser.config.koAnimation?.type || 'default_stars';
    const elapsedSec = (240 - state.koSequenceTicks) / 60; // 0.0 to 4.0s
    const t = performance.now() * 0.001;

    // 1. DANDAN K.O. FALL ('dandan_dart')
    if (koAnimType === 'dandan_dart' || loser.config.id === 'fighter_dandan') {
      this.dandanKoGroup.visible = true;
      this.moshonKoGroup.visible = false;
      this.matthewKoGroup.visible = false;
      this.defaultKoGroup.visible = false;

      // Tools pop off one by one
      this.dandanToolMeshes.forEach((mesh, idx) => {
        const dropStartTime = 1.0 + idx * 0.3; // 1.0s, 1.3s, 1.6s, 1.9s
        if (elapsedSec >= dropStartTime) {
          mesh.visible = true;
          const toolTime = elapsedSec - dropStartTime;
          const bounceY = Math.max(0.04, 0.9 - toolTime * 2.2 + Math.abs(Math.sin(toolTime * 10)) * Math.max(0, 0.4 - toolTime * 0.5));
          const offsetX = (idx - 1.5) * 0.35 + (idx % 2 === 0 ? 0.15 : -0.15);
          mesh.position.set(loser.x + offsetX, bounceY, 0.15);
          mesh.rotation.z = idx * 1.2 + (bounceY > 0.06 ? toolTime * 6 : 0);
        } else {
          mesh.visible = false;
        }
      });

      // Ghost floats up from 1.4s to 4.0s
      if (elapsedSec >= 1.4) {
        this.dandanGhostSprite.visible = true;
        const ghostTime = elapsedSec - 1.4;
        const ghostY = 0.9 + ghostTime * 0.55 + Math.sin(t * 5.0) * 0.08;
        this.dandanGhostSprite.position.set(loser.x + 0.25, ghostY, 0.2);
        (this.dandanGhostSprite.material as THREE.SpriteMaterial).opacity = Math.min(1.0, ghostTime * 1.8);
      } else {
        this.dandanGhostSprite.visible = false;
      }
      return;
    }

    // 2. MOSHON K.O. FALL ('moshon_phone')
    if (koAnimType === 'moshon_phone' || loser.config.id === 'fighter_moshon') {
      this.moshonKoGroup.visible = true;
      this.dandanKoGroup.visible = false;
      this.matthewKoGroup.visible = false;
      this.defaultKoGroup.visible = false;

      // Glasses fly off in slowmo and land next to him
      this.moshonGlassesMesh.visible = true;
      if (elapsedSec < 0.9) {
        const gTime = elapsedSec / 0.9;
        const arcY = Math.max(0.04, 1.4 * (1 - gTime) + Math.sin(gTime * Math.PI) * 0.6);
        this.moshonGlassesMesh.position.set(loser.x + gTime * 0.75 * loser.facing, arcY, 0.2);
        this.moshonGlassesMesh.rotation.set(gTime * Math.PI * 3, gTime * Math.PI * 2, gTime * Math.PI * 4);
      } else {
        this.moshonGlassesMesh.position.set(loser.x + 0.75 * loser.facing, 0.04, 0.2);
        this.moshonGlassesMesh.rotation.set(0.1, 0.4, 0.2);
      }

      // Phone falls out of pocket at 1.0s, rings with "LINOY CALLING"
      if (elapsedSec >= 1.0) {
        this.moshonPhoneGroup.visible = true;
        const pTime = elapsedSec - 1.0;
        const phoneY = Math.max(0.04, 0.8 - pTime * 2.0);
        // Buzzing / vibration shake
        const buzzX = Math.sin(t * 35.0) * 0.025;
        const buzzY = Math.cos(t * 35.0) * 0.025;
        this.moshonPhoneGroup.position.set(loser.x - 0.55 * loser.facing + buzzX, phoneY + buzzY, 0.2);

        // Flashing popup card
        const popupScale = 1.0 + Math.sin(t * 12.0) * 0.12;
        this.moshonPhonePopupMesh.scale.set(popupScale, popupScale, 1);
      } else {
        this.moshonPhoneGroup.visible = false;
      }

      // Ghost floats up from 1.4s to 2.4s, then snaps back into body at 2.5s - 3.5s
      if (elapsedSec >= 1.4) {
        this.moshonGhostSprite.visible = true;
        let ghostY = 1.0;
        if (elapsedSec < 2.4) {
          // Floating up toward heaven
          const riseTime = elapsedSec - 1.4;
          ghostY = 1.0 + riseTime * 0.9 + Math.sin(t * 4.0) * 0.06;
          this.moshonTetherMesh.visible = false;
        } else {
          // Ringing phone pulls ghost back down!
          const pullTime = (elapsedSec - 2.4) / 1.0; // 0 to 1
          const pullT = Math.min(1.0, Math.max(0.0, pullTime));
          ghostY = 1.9 * (1 - pullT * pullT) + 0.3;

          // Tether line from phone to ghost
          this.moshonTetherMesh.visible = true;
          const phonePos = this.moshonPhoneGroup.position;
          const points = [
            new THREE.Vector3(phonePos.x, phonePos.y + 0.1, 0.2),
            new THREE.Vector3(loser.x, ghostY, 0.2),
          ];
          this.moshonTetherMesh.geometry.setFromPoints(points);
        }
        this.moshonGhostSprite.position.set(loser.x, ghostY, 0.25);
      } else {
        this.moshonGhostSprite.visible = false;
        this.moshonTetherMesh.visible = false;
      }
      return;
    }

    // 3. MATTHEW K.O. FALL ('matthew_timber')
    if (koAnimType === 'matthew_timber' || loser.config.id === 'fighter_matthew') {
      this.matthewKoGroup.visible = true;
      this.dandanKoGroup.visible = false;
      this.moshonKoGroup.visible = false;
      this.defaultKoGroup.visible = false;

      // Crater decal on impact (after 1.8s)
      if (elapsedSec >= 1.7) {
        this.matthewKoCraterDecal.visible = true;
        this.matthewKoCraterDecal.position.set(loser.x, 0.015, 0);
      } else {
        this.matthewKoCraterDecal.visible = false;
      }

      // Snoring bubbles & thought cloud after landing
      if (elapsedSec >= 2.0) {
        this.matthewZzzSprite.visible = true;
        const zzzTime = elapsedSec - 2.0;
        const zzzY = 1.1 + Math.sin(t * 3.5) * 0.06;
        this.matthewZzzSprite.position.set(loser.x + 0.2, zzzY, 0.3);
        (this.matthewZzzSprite.material as THREE.SpriteMaterial).opacity = Math.min(1.0, zzzTime * 2.0);
      } else {
        this.matthewZzzSprite.visible = false;
      }
      return;
    }

    // 4. DEFAULT FIGHTERS K.O. FALL ('default_stars')
    this.defaultKoGroup.visible = true;
    this.dandanKoGroup.visible = false;
    this.moshonKoGroup.visible = false;
    this.matthewKoGroup.visible = false;

    // Orbiting stars circling above head
    if (elapsedSec >= 0.8) {
      const starRadius = 0.55;
      const headY = 0.45;
      this.defaultKoStars.forEach((star, i) => {
        const starAngle = t * 4.2 + (i / this.defaultKoStars.length) * Math.PI * 2;
        star.position.set(
          loser.x + Math.cos(starAngle) * starRadius,
          headY + Math.sin(starAngle) * 0.18 + 0.25,
          Math.sin(starAngle) * starRadius * 0.7
        );
        star.rotation.set(t * 5, t * 5, t * 5);
      });
    }
  }

  /**
   * Helper to create engraved gold medallion texture for Moshon's "Jasmin" pendant
   */
  private createJasminMedallionTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Circular medallion clip
    ctx.beginPath();
    ctx.arc(256, 256, 252, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // 1. Lustrous brushed gold radial gradient
    const goldGrad = ctx.createRadialGradient(190, 170, 16, 256, 256, 256);
    goldGrad.addColorStop(0, '#fffbeb');   // Specular shine highlight
    goldGrad.addColorStop(0.20, '#fef08a'); // Bright gold
    goldGrad.addColorStop(0.48, '#eab308'); // Pure metallic gold
    goldGrad.addColorStop(0.80, '#ca8a04'); // Rich deep gold
    goldGrad.addColorStop(0.96, '#a16207'); // Dark bronze gold rim
    goldGrad.addColorStop(1.0, '#78350f');  // Shadow edge
    ctx.fillStyle = goldGrad;
    ctx.fill();

    // 2. Beveled outer border ring
    ctx.strokeStyle = '#fef9c3';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(256, 256, 240, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#713f12';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(256, 256, 230, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Delicate inner engraved decorative ring
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.arc(256, 256, 206, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. "Jasmin" engraved in elegant cursive script
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'italic bold 96px "Brush Script MT", "Great Vibes", "Lucida Handwriting", "Dancing Script", "Segoe Script", "Apple Chancery", cursive';

    // Engraved inset depth shadow
    ctx.fillStyle = '#451a03';
    ctx.fillText('Jasmin', 257, 254);
    ctx.fillText('Jasmin', 258, 255);

    // Beveled rim reflection underneath
    ctx.fillStyle = '#fef08a';
    ctx.fillText('Jasmin', 255, 249);

    // Main dark engraved gold text
    ctx.fillStyle = '#552200';
    ctx.fillText('Jasmin', 256, 251);

    // Small decorative flourish hearts/stars beneath name
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 30px serif';
    ctx.fillText('✦  ❤  ✦', 256, 312);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  /**
   * Helper to create crisp 2D text canvas textures for in-game comedy billboards (phone calls, FATAL ERROR, etc.)
   */
  private createTextCanvasTexture(
    lines: string[],
    bgColor: string,
    textColor: string,
    borderColor = '#38bdf8'
  ): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 192;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bgColor;
    if (ctx.roundRect) {
      ctx.roundRect(8, 8, 368, 176, 20);
    } else {
      ctx.rect(8, 8, 368, 176);
    }
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (lines.length === 1) {
      ctx.font = 'bold 30px monospace, system-ui, sans-serif';
      ctx.fillText(lines[0], 192, 96);
    } else if (lines.length === 2) {
      ctx.font = 'bold 26px monospace, system-ui, sans-serif';
      ctx.fillText(lines[0], 192, 65);
      ctx.font = 'bold 22px monospace, system-ui, sans-serif';
      ctx.fillText(lines[1], 192, 125);
    } else {
      ctx.font = 'bold 24px monospace, system-ui, sans-serif';
      ctx.fillText(lines[0], 192, 50);
      ctx.font = 'bold 20px monospace, system-ui, sans-serif';
      ctx.fillText(lines[1], 192, 96);
      ctx.font = 'bold 18px monospace, system-ui, sans-serif';
      ctx.fillText(lines[2], 192, 140);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  /**
   * Registers an arena mesh for camera line-of-sight occlusion fading
   */
  private registerOccludable(mesh: THREE.Mesh) {
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => {
          m.transparent = true;
          m.opacity = 1.0;
        });
      } else {
        mesh.material.transparent = true;
        mesh.material.opacity = 1.0;
      }
    }
    this.occludableArenaMeshes.push(mesh);
  }

  private setupParticleSystem() {
    const count = 150;
    const geo = new THREE.DodecahedronGeometry(0.14, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMeshes = new THREE.InstancedMesh(geo, mat, count);
    this.particleMeshes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMeshes.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    this.scene.add(this.particleMeshes);

    // Blood splats lying flat on the mat (Y = 0.015)
    const splatCount = 60;
    const splatGeo = new THREE.CircleGeometry(0.24, 14);
    splatGeo.rotateX(-Math.PI / 2);
    const splatMat = new THREE.MeshBasicMaterial({
      color: 0xff1a1a,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    this.splatMeshes = new THREE.InstancedMesh(splatGeo, splatMat, splatCount);
    this.splatMeshes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.splatMeshes);
  }

  private updateSplats(splats: BloodSplat[]) {
    if (!this.splatMeshes) return;
    const count = 60;
    for (let i = 0; i < count; i++) {
      if (i < splats.length) {
        const s = splats[i];
        const fade = Math.min(1, s.life / 100);
        const curScale = s.scale * Math.max(0.01, fade);
        this.splatDummy.position.set(s.x, 0.015, s.z);
        this.splatDummy.rotation.set(0, s.rotation, 0);
        this.splatDummy.scale.set(curScale, 1, curScale);
        this.splatDummy.updateMatrix();
        this.splatMeshes.setMatrixAt(i, this.splatDummy.matrix);
      } else {
        this.splatDummy.scale.set(0, 0, 0);
        this.splatDummy.updateMatrix();
        this.splatMeshes.setMatrixAt(i, this.splatDummy.matrix);
      }
    }
    this.splatMeshes.instanceMatrix.needsUpdate = true;
  }

  public updateCharacters(p1: FighterState, p2: FighterState, state?: GameState) {
    if (this.currentP1Id !== p1.config.id || !this.p1Rig) {
      if (this.p1Rig) this.scene.remove(this.p1Rig.root);
      this.p1Rig = this.buildHierarchicalCharacterRig(p1.config);
      this.scene.add(this.p1Rig.root);
      this.currentP1Id = p1.config.id;
    }

    if (this.currentP2Id !== p2.config.id || !this.p2Rig) {
      if (this.p2Rig) this.scene.remove(this.p2Rig.root);
      this.p2Rig = this.buildHierarchicalCharacterRig(p2.config);
      this.scene.add(this.p2Rig.root);
      this.currentP2Id = p2.config.id;
    }

    this.animateCharacter(this.p1Rig, p1, state);
    this.animateCharacter(this.p2Rig, p2, state);
  }

  /**
   * Rebuilds the character as a proper hierarchical rig with joint pivots:
   * Hips -> Spine -> Neck -> Head
   * Spine -> Shoulders -> Elbows -> Wrists -> Hands
   * Hips -> Hips/Thighs -> Knees -> Ankles -> Feet
   * Fully connected with zero floating parts, customizable body, face, hair, clothing & accessories.
   */
  public buildHierarchicalCharacterRig(config: FighterConfig): CharacterRig {
    const app = config.appearance;
    const root = new THREE.Group();
    const bodyMesh = new THREE.Group();
    root.add(bodyMesh);

    // 1. Materials with MeshToonMaterial for clean cartoon arcade shading
    const skinMat = this.createToonMat(app.skinColor);
    const skinMaterials: THREE.MeshToonMaterial[] = [skinMat];
    const primaryMat = this.createToonMat(app.pantsColor ?? app.primaryColor);
    const shirtMat = this.createToonMat(app.shirtColor ?? app.primaryColor);
    const secondaryMat = this.createToonMat(app.secondaryColor);
    const gloveMat = this.createToonMat(app.gloveColor);
    const hairMat = this.createToonMat(app.hairColor);
    const shoesMat = this.createToonMat(app.shoesColor ?? app.secondaryColor);
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: app.eyeColor ?? 0x09090b });
    const browMat = this.createToonMat(app.hairColor);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
    const toothMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const goldMat = this.createToonMat(0xfacc15);

    // 2. Body Dimensions based on bodyType
    const bType = app.bodyType || 'average';
    let torsoW = 0.76;
    let torsoH = 0.55;
    let torsoD = 0.46;
    let pelvisW = 0.66;
    let pelvisH = 0.34;
    let pelvisD = 0.46;
    let headRadius = 0.42;
    let armThick = 0.13;
    let upperArmLen = 0.32;
    let forearmLen = 0.30;
    let legThick = 0.14;
    let thighLen = 0.36;
    let calfLen = 0.36;
    let hipY = 0.85;

    if (config.id === 'fighter_matthew') {
      // Matthew "The Terrifying": Chubby Tank build, wider torso, round protruding belly, thicker arms than other fighters
      torsoW = 0.98;
      torsoH = 0.60;
      torsoD = 0.62;
      pelvisW = 0.86;
      pelvisH = 0.36;
      pelvisD = 0.56;
      headRadius = 0.46;
      armThick = 0.19; // clearly thicker arms than other fighters (0.19 vs 0.11-0.16)
      upperArmLen = 0.34;
      forearmLen = 0.31;
      legThick = 0.18;
      thighLen = 0.35;
      calfLen = 0.35;
      hipY = 0.83;
    } else if (bType === 'heavy' || bType === 'bulky') {
      torsoW = 0.88;
      torsoH = 0.58;
      torsoD = 0.52;
      pelvisW = 0.76;
      pelvisH = 0.35;
      pelvisD = 0.48;
      headRadius = 0.46;
      armThick = 0.16;
      upperArmLen = 0.34;
      forearmLen = 0.32;
      legThick = 0.17;
      thighLen = 0.36;
      calfLen = 0.36;
      hipY = 0.85;
    } else if (config.id === 'fighter_dandan') {
      // Dandan: slim and lanky, slightly longer arms
      torsoW = 0.63;
      torsoH = 0.54;
      torsoD = 0.41;
      pelvisW = 0.56;
      pelvisH = 0.32;
      pelvisD = 0.40;
      headRadius = 0.40;
      armThick = 0.105;
      upperArmLen = 0.37; // slightly longer arms
      forearmLen = 0.35; // slightly longer arms
      legThick = 0.12;
      thighLen = 0.38;
      calfLen = 0.38;
      hipY = 0.86;
    } else if (config.id === 'fighter_moshon') {
      // Moshon: lean athletic build, sharp proportions
      torsoW = 0.67;
      torsoH = 0.56;
      torsoD = 0.42;
      pelvisW = 0.58;
      pelvisH = 0.32;
      pelvisD = 0.40;
      headRadius = 0.39;
      armThick = 0.115;
      upperArmLen = 0.34;
      forearmLen = 0.31;
      legThick = 0.125;
      thighLen = 0.38;
      calfLen = 0.38;
      hipY = 0.86;
    } else if (bType === 'slim') {
      torsoW = 0.65;
      torsoH = 0.52;
      torsoD = 0.42;
      pelvisW = 0.58;
      pelvisH = 0.32;
      pelvisD = 0.44;
      headRadius = 0.40;
      armThick = 0.11;
      upperArmLen = 0.30;
      forearmLen = 0.28;
      legThick = 0.12;
      thighLen = 0.35;
      calfLen = 0.35;
      hipY = 0.83;
    } else if (bType === 'tall') {
      torsoW = 0.70;
      torsoH = 0.64;
      torsoD = 0.44;
      pelvisW = 0.62;
      pelvisH = 0.34;
      pelvisD = 0.46;
      headRadius = 0.41;
      armThick = 0.12;
      upperArmLen = 0.38;
      forearmLen = 0.36;
      legThick = 0.13;
      thighLen = 0.42;
      calfLen = 0.42;
      hipY = 0.96;
    }

    const armThickness = armThick;
    const legThickness = legThick;

    // 3. Root Pelvis / Hips Group (Pivot at base of waist)
    const hips = new THREE.Group();
    hips.position.y = hipY;
    bodyMesh.add(hips);

    const pelvisMat = (app.pantsType === 'tights' || app.pantsType === 'gi_pants') ? primaryMat : primaryMat;
    const pelvisGeo = new THREE.BoxGeometry(pelvisW, pelvisH, pelvisD);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, pelvisMat);
    pelvisMesh.position.y = 0;
    pelvisMesh.castShadow = true;
    this.addOutline(pelvisMesh, 1.06);
    hips.add(pelvisMesh);

    // Waist Belt / Trim / Accessories
    const acc = app.accessory || app.specialItem;
    let toolBeltMesh: THREE.Group | undefined;
    if (acc === 'boxing_belt') {
      // Championship Gold Boxing Belt
      const beltGeo = new THREE.BoxGeometry(pelvisW * 1.06, pelvisH * 0.65, pelvisD * 1.08);
      const beltMesh = new THREE.Mesh(beltGeo, goldMat);
      beltMesh.position.y = pelvisH * 0.1;
      this.addOutline(beltMesh, 1.06);
      hips.add(beltMesh);

      const plateGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 12);
      const plate = new THREE.Mesh(plateGeo, goldMat);
      plate.rotation.x = Math.PI / 2;
      plate.position.set(0, pelvisH * 0.1, pelvisD * 0.58);
      this.addOutline(plate, 1.08);
      hips.add(plate);
    } else if (acc === 'black_belt') {
      // Martial Arts Black Belt with Tied Ribbon Knot
      const blackBeltMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(pelvisW * 1.05, 0.12, pelvisD * 1.06), blackBeltMat);
      bMesh.position.y = pelvisH * 0.3;
      this.addOutline(bMesh, 1.06);
      hips.add(bMesh);

      // Knot and tails
      const knot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.12), blackBeltMat);
      knot.position.set(0, pelvisH * 0.28, pelvisD * 0.56);
      hips.add(knot);

      const tail1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, 0.05), blackBeltMat);
      tail1.position.set(-0.06, pelvisH * 0.08, pelvisD * 0.58);
      tail1.rotation.z = 0.2;
      hips.add(tail1);

      const tail2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.05), blackBeltMat);
      tail2.position.set(0.06, pelvisH * 0.1, pelvisD * 0.58);
      tail2.rotation.z = -0.25;
      hips.add(tail2);
    } else if (acc === 'tool_belt') {
      toolBeltMesh = new THREE.Group();
      const brownMat = this.createToonMat(0x78350f);
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(pelvisW * 1.05, 0.14, pelvisD * 1.06), brownMat);
      bMesh.position.y = pelvisH * 0.25;
      this.addOutline(bMesh, 1.06);
      toolBeltMesh.add(bMesh);

      // Belt buckle (brass gold)
      const buckleGeo = new THREE.BoxGeometry(0.14, 0.16, 0.06);
      const buckle = new THREE.Mesh(buckleGeo, goldMat);
      buckle.position.set(0, pelvisH * 0.25, pelvisD * 0.55);
      this.addOutline(buckle, 1.08);
      toolBeltMesh.add(buckle);

      // Leather tool pouch
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.14), brownMat);
      pouch.position.set(pelvisW * 0.52, pelvisH * 0.2, 0);
      this.addOutline(pouch, 1.06);
      toolBeltMesh.add(pouch);

      // Steel wrench hanging in tool belt loop
      const wrenchBeltMat = this.createToonMat(0x94a3b8);
      const wrenchBeltGroup = new THREE.Group();
      const wrenchHandle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.30, 0.03), wrenchBeltMat);
      wrenchBeltGroup.add(wrenchHandle);
      const wrenchBeltHead = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.024, 6, 8, Math.PI * 1.6), wrenchBeltMat);
      wrenchBeltHead.position.y = 0.14;
      wrenchBeltGroup.add(wrenchBeltHead);
      wrenchBeltGroup.position.set(-pelvisW * 0.52, pelvisH * 0.15, 0.06);
      wrenchBeltGroup.rotation.z = -0.15;
      this.addOutline(wrenchHandle, 1.08);
      toolBeltMesh.add(wrenchBeltGroup);

      // Roll of duct tape hanging from belt loop
      const tapeMat = this.createToonMat(0x64748b);
      const cardMat = this.createToonMat(0xb45309);
      const tapeGroup = new THREE.Group();
      const outerTape = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12), tapeMat);
      tapeGroup.add(outerTape);
      const innerCard = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.082, 12), cardMat);
      tapeGroup.add(innerCard);
      tapeGroup.rotation.x = Math.PI / 2;
      tapeGroup.position.set(pelvisW * 0.36, pelvisH * 0.12, pelvisD * 0.55);
      toolBeltMesh.add(tapeGroup);

      hips.add(toolBeltMesh);
    } else {
      // Standard waistband trim
      const beltGeo = new THREE.BoxGeometry(pelvisW * 1.03, 0.1, pelvisD * 1.03);
      const beltMesh = new THREE.Mesh(beltGeo, secondaryMat);
      beltMesh.position.y = pelvisH * 0.45;
      this.addOutline(beltMesh, 1.05);
      hips.add(beltMesh);
    }

    // 4. Spine Group (Pivot at waist, directly connected to hips)
    const spine = new THREE.Group();
    spine.position.set(0, pelvisH * 0.5, 0);
    hips.add(spine);

    // Torso Clothing / Geometry
    const isBareChest = app.shirtType === 'bare_chest' || (!app.shirtType && (bType === 'heavy' || bType === 'bulky'));
    const isGi = app.shirtType === 'gi';
    const isTank = app.shirtType === 'tank_top';

    const torsoMat = isBareChest ? skinMat : shirtMat;
    const torsoGeo = new THREE.BoxGeometry(torsoW, torsoH, torsoD);
    const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
    torsoMesh.position.set(0, torsoH * 0.5, 0);
    torsoMesh.castShadow = true;
    this.addOutline(torsoMesh, 1.06);
    spine.add(torsoMesh);

    // Mustard-gold rectangle print on chest for Dandan, or graphic for others
    const isMoshon = config.id === 'fighter_moshon';
    const isMatthew = config.id === 'fighter_matthew';
    if (config.id === 'fighter_dandan') {
      // White loose t-shirt with a mustard-gold rectangle print on the chest (no logos)
      const graphicMat = this.createToonMat(0xd97706);
      const graphicGeo = new THREE.BoxGeometry(torsoW * 0.54, torsoH * 0.38, 0.03);
      const graphicMesh = new THREE.Mesh(graphicGeo, graphicMat);
      graphicMesh.position.set(0, torsoH * 0.58, torsoD * 0.51);
      this.addOutline(graphicMesh, 1.05);
      spine.add(graphicMesh);
    } else if (isMoshon) {
      // Moshon: Black zip-up track jacket with dark slate gray shoulder panels,
      // Maccabi green circular crest with gold star on left chest, white curved swoosh on right chest,
      // silver zipper, and unzipped collar showing light gray undershirt
      const darkGrayMat = this.createToonMat(0x334155);
      const leftShoulderPanel = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 0.44, torsoH * 0.28, torsoD * 1.02), darkGrayMat);
      leftShoulderPanel.position.set(torsoW * 0.28, torsoH * 0.86, 0);
      this.addOutline(leftShoulderPanel, 1.05);
      spine.add(leftShoulderPanel);

      const rightShoulderPanel = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 0.44, torsoH * 0.28, torsoD * 1.02), darkGrayMat);
      rightShoulderPanel.position.set(-torsoW * 0.28, torsoH * 0.86, 0);
      this.addOutline(rightShoulderPanel, 1.05);
      spine.add(rightShoulderPanel);

      // Silver zipper line down center
      const zipperMat = this.createToonMat(0x94a3b8);
      const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.04, torsoH * 0.90, 0.03), zipperMat);
      zipper.position.set(0, torsoH * 0.46, torsoD * 0.515);
      spine.add(zipper);

      // Green circular club badge on left chest (Maccabi green #15803d)
      const greenPatchMat = this.createToonMat(0x15803d);
      const patch = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.03, 16), greenPatchMat);
      patch.rotation.x = Math.PI / 2;
      patch.position.set(torsoW * 0.24, torsoH * 0.65, torsoD * 0.52);
      this.addOutline(patch, 1.06);
      spine.add(patch);

      // Gold star above club badge
      const starMesh = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.04, 5), goldMat);
      starMesh.position.set(torsoW * 0.24, torsoH * 0.77, torsoD * 0.52);
      spine.add(starMesh);

      // White athletic check/swoosh mark on right chest
      const whiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
      const swoosh1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.024, 0.02), whiteMat);
      swoosh1.position.set(-torsoW * 0.24, torsoH * 0.65, torsoD * 0.52);
      swoosh1.rotation.z = -0.35;
      spine.add(swoosh1);
      const swoosh2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.024, 0.02), whiteMat);
      swoosh2.position.set(-torsoW * 0.28, torsoH * 0.63, torsoD * 0.52);
      swoosh2.rotation.z = 0.55;
      spine.add(swoosh2);

      // Unzipped stand-up track jacket collar opening showing light gray ribbed undershirt
      const collarMat = this.createToonMat(0x9ca3af);
      const undershirt = new THREE.Mesh(new THREE.BoxGeometry(torsoW * 0.38, 0.12, torsoD * 0.36), collarMat);
      undershirt.position.set(0, torsoH * 0.94, torsoD * 0.22);
      spine.add(undershirt);

      // Left and right track collar wings
      const jacketCollarMat = this.createToonMat(0x18181b);
      const leftCollarWing = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.10), jacketCollarMat);
      leftCollarWing.position.set(torsoW * 0.22, torsoH * 0.98, torsoD * 0.42);
      leftCollarWing.rotation.y = -0.3;
      spine.add(leftCollarWing);

      const rightCollarWing = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.10), jacketCollarMat);
      rightCollarWing.position.set(-torsoW * 0.22, torsoH * 0.98, torsoD * 0.42);
      rightCollarWing.rotation.y = 0.3;
      spine.add(rightCollarWing);
    } else if (isMatthew) {
      // Matthew: Round protruding belly clearly sticking out in front (covered in plain black t-shirt)
      const bellyMat = shirtMat;
      const bellyGeo = new THREE.SphereGeometry(0.40, 16, 16);
      bellyGeo.scale(1.15, 0.95, 0.95);
      const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
      bellyMesh.position.set(0, torsoH * 0.36, torsoD * 0.38);
      this.addOutline(bellyMesh, 1.06);
      spine.add(bellyMesh);

      // Plain black V-neck collar detail revealing warm brown skin (#B07850)
      const vNeckMat = skinMat;
      const vNeckGeo = new THREE.ConeGeometry(0.13, 0.18, 3);
      vNeckGeo.rotateZ(Math.PI);
      const vNeckMesh = new THREE.Mesh(vNeckGeo, vNeckMat);
      vNeckMesh.position.set(0, torsoH * 0.86, torsoD * 0.515);
      spine.add(vNeckMesh);
    } else if (app.shirtType === 'tshirt') {
      const graphicMat = this.createToonMat(app.graphicColor ?? app.secondaryColor ?? 0xd97706);
      // Abstract geometric graphic block
      const graphicGeo = new THREE.BoxGeometry(torsoW * 0.54, torsoH * 0.48, 0.04);
      const graphicMesh = new THREE.Mesh(graphicGeo, graphicMat);
      graphicMesh.position.set(0, torsoH * 0.55, torsoD * 0.51);
      this.addOutline(graphicMesh, 1.06);
      spine.add(graphicMesh);

      // Inner graphic shape / contrast stripe
      const innerGraphicGeo = new THREE.BoxGeometry(torsoW * 0.36, torsoH * 0.18, 0.05);
      const innerGraphicMesh = new THREE.Mesh(innerGraphicGeo, shirtMat);
      innerGraphicMesh.position.set(0, torsoH * 0.55, torsoD * 0.515);
      spine.add(innerGraphicMesh);
    }

    // Chest / Muscle or Gi Lapels
    if (isBareChest && (bType === 'heavy' || bType === 'bulky' || bType === 'average')) {
      const pecGeo = new THREE.BoxGeometry(torsoW * 0.94, 0.26, 0.1);
      const pecMesh = new THREE.Mesh(pecGeo, skinMat);
      pecMesh.position.set(0, torsoH * 0.62, torsoD * 0.5);
      this.addOutline(pecMesh, 1.05);
      spine.add(pecMesh);
    } else if (isGi) {
      // Crossed Gi Lapels
      const lapelGeo = new THREE.BoxGeometry(0.12, torsoH * 0.9, 0.08);
      const lapel1 = new THREE.Mesh(lapelGeo, secondaryMat);
      lapel1.position.set(-torsoW * 0.18, torsoH * 0.55, torsoD * 0.51);
      lapel1.rotation.z = -0.32;
      spine.add(lapel1);

      const lapel2 = new THREE.Mesh(lapelGeo, secondaryMat);
      lapel2.position.set(torsoW * 0.18, torsoH * 0.55, torsoD * 0.51);
      lapel2.rotation.z = 0.32;
      spine.add(lapel2);
    } else if (isTank) {
      // Tank top straps
      const strapGeo = new THREE.BoxGeometry(0.12, torsoH * 0.35, 0.06);
      const s1 = new THREE.Mesh(strapGeo, shirtMat);
      s1.position.set(-torsoW * 0.32, torsoH * 0.82, torsoD * 0.48);
      spine.add(s1);
      const s2 = new THREE.Mesh(strapGeo, shirtMat);
      s2.position.set(torsoW * 0.32, torsoH * 0.82, torsoD * 0.48);
      spine.add(s2);
    }

    // 5. Neck Group (Pivot at top of torso, connects torso to head)
    const neck = new THREE.Group();
    neck.position.set(0, torsoH, 0);
    spine.add(neck);

    const neckRadius = bType === 'heavy' ? 0.22 : 0.18;
    const neckH = 0.16;
    const neckGeo = new THREE.CylinderGeometry(neckRadius * 0.95, neckRadius, neckH, 12);
    const neckMesh = new THREE.Mesh(neckGeo, skinMat);
    neckMesh.position.y = neckH * 0.5;
    neckMesh.castShadow = true;
    this.addOutline(neckMesh, 1.08);
    neck.add(neckMesh);

    // Gold Chain Accessory (or for Moshon)
    let chainMesh: THREE.Group | undefined;
    let pendantMesh: THREE.Group | undefined;
    if (acc === 'chain' || isMoshon) {
      // Realistic thin gold chain made of small links, hanging loosely around his neck and resting on his chest
      chainMesh = new THREE.Group();

      const shinyGoldMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.92,
        roughness: 0.16,
      });

      const neckY = torsoH;
      const chestZ = torsoD * 0.50; // Front surface of torso (0.23)

      // Natural catenary loop hanging loosely around neck and draping across chest
      const chainPoints = [
        new THREE.Vector3(0, neckY + 0.04, -neckRadius * 0.70),                 // Back neck center
        new THREE.Vector3(neckRadius * 0.75, neckY + 0.03, -neckRadius * 0.28), // Back-right neck
        new THREE.Vector3(neckRadius * 0.85, neckY * 0.92, neckRadius * 0.35),  // Right collar
        new THREE.Vector3(neckRadius * 0.55, neckY * 0.76, chestZ + 0.012),     // Right upper chest
        new THREE.Vector3(neckRadius * 0.28, neckY * 0.60, chestZ + 0.020),     // Right mid chest
        new THREE.Vector3(0, neckY * 0.50, chestZ + 0.024),                    // Bottom apex of chain
        new THREE.Vector3(-neckRadius * 0.28, neckY * 0.60, chestZ + 0.020),    // Left mid chest
        new THREE.Vector3(-neckRadius * 0.55, neckY * 0.76, chestZ + 0.012),    // Left upper chest
        new THREE.Vector3(-neckRadius * 0.85, neckY * 0.92, neckRadius * 0.35), // Left collar
        new THREE.Vector3(-neckRadius * 0.75, neckY + 0.03, -neckRadius * 0.28),// Back-left neck
      ];
      const chainCurve = new THREE.CatmullRomCurve3(chainPoints, true);

      // Thin connecting core tube ensures continuous unbroken gold line
      const tubeGeo = new THREE.TubeGeometry(chainCurve, 42, 0.0036, 6, true);
      const tubeMesh = new THREE.Mesh(tubeGeo, shinyGoldMat);
      chainMesh.add(tubeMesh);

      // Small realistic interlocking chain links along curve
      const numLinks = 36;
      const linkGeo = new THREE.TorusGeometry(0.0135, 0.0036, 6, 12);
      for (let i = 0; i < numLinks; i++) {
        const t = i / numLinks;
        const pt = chainCurve.getPoint(t);
        const tangent = chainCurve.getTangent(t).normalize();
        const link = new THREE.Mesh(linkGeo, shinyGoldMat);
        link.position.copy(pt);

        // Align link along curve tangent
        const defaultAxis = new THREE.Vector3(0, 0, 1);
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultAxis, tangent);
        link.quaternion.copy(quat);

        // Alternate interlocking link angle by 90 degrees
        if (i % 2 === 1) {
          link.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.PI / 2);
        }
        chainMesh.add(link);
      }

      // Round Gold Pendant (Medallion) at the bottom with "Jasmin" engraved in elegant script
      pendantMesh = new THREE.Group();
      // Bail loop connecting medallion to the chain
      const bailGeo = new THREE.TorusGeometry(0.013, 0.0035, 6, 12);
      const bailMesh = new THREE.Mesh(bailGeo, shinyGoldMat);
      bailMesh.position.set(0, neckY * 0.50 - 0.012, chestZ + 0.024);
      pendantMesh.add(bailMesh);

      // Medallion Disc
      const medallionRadius = 0.068;
      const medallionThickness = 0.012;
      const medallionGeo = new THREE.CylinderGeometry(medallionRadius, medallionRadius, medallionThickness, 32);
      const jasminTexture = this.createJasminMedallionTexture();
      const medallionFaceMat = new THREE.MeshStandardMaterial({
        map: jasminTexture,
        metalness: 0.88,
        roughness: 0.20,
      });

      // Cylinder materials: [side, top cap (front), bottom cap (back)]
      const medallionMaterials = [shinyGoldMat, medallionFaceMat, medallionFaceMat];
      const medallionMesh = new THREE.Mesh(medallionGeo, medallionMaterials);
      medallionMesh.rotation.x = Math.PI / 2; // Flat circle facing forward
      medallionMesh.position.set(0, neckY * 0.50 - 0.076, chestZ + 0.026);
      pendantMesh.add(medallionMesh);

      // Outer raised golden bevel rim
      const rimGeo = new THREE.TorusGeometry(medallionRadius, 0.0048, 8, 32);
      const rimMesh = new THREE.Mesh(rimGeo, shinyGoldMat);
      rimMesh.position.set(0, neckY * 0.50 - 0.076, chestZ + 0.026);
      pendantMesh.add(rimMesh);

      chainMesh.add(pendantMesh);
      spine.add(chainMesh);
    }

    // 6. Head Group (Pivot at top of neck)
    const head = new THREE.Group();
    head.position.set(0, neckH, 0);
    neck.add(head);

    // Head Shape
    const isDandan = config.id === 'fighter_dandan';
    const hShape = app.headShape || (app.faceType === 'square' ? 'square' : 'round');
    let headGeo: THREE.BufferGeometry;
    if (isDandan || isMoshon) {
      // Slightly oval: taller than wide
      headGeo = new THREE.SphereGeometry(headRadius, 24, 24);
      headGeo.scale(0.88, 1.16, 0.94);
    } else if (hShape === 'square') {
      headGeo = new THREE.BoxGeometry(headRadius * 1.75, headRadius * 1.75, headRadius * 1.65);
    } else if (hShape === 'chiseled') {
      headGeo = new THREE.BoxGeometry(headRadius * 1.6, headRadius * 1.85, headRadius * 1.55);
    } else if (hShape === 'oval') {
      headGeo = new THREE.SphereGeometry(headRadius, 16, 16);
      headGeo.scale(0.9, 1.15, 0.95);
    } else {
      headGeo = new THREE.SphereGeometry(headRadius, 16, 16);
    }

    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.position.set(0, headRadius * 0.75, 0);
    headMesh.castShadow = true;
    this.addOutline(headMesh, 1.06);
    head.add(headMesh);

    // Small ears for Dandan, and Pointy elf-like ears for Moshon (clearly sticking out in side view)
    if (isDandan) {
      const earGeo = new THREE.SphereGeometry(0.082, 12, 10);
      earGeo.scale(0.40, 1.15, 0.75);

      const leftEar = new THREE.Mesh(earGeo, skinMat);
      leftEar.position.set(headRadius * 0.94, headRadius * 0.74, -0.02);
      leftEar.rotation.y = 0.22;
      leftEar.rotation.z = -0.28; // sticks out a bit from oval head
      this.addOutline(leftEar, 1.08);
      head.add(leftEar);

      const rightEar = new THREE.Mesh(earGeo, skinMat);
      rightEar.position.set(-headRadius * 0.94, headRadius * 0.74, -0.02);
      rightEar.rotation.y = -0.22;
      rightEar.rotation.z = 0.28; // sticks out a bit from oval head
      this.addOutline(rightEar, 1.08);
      head.add(rightEar);
    } else if (isMoshon) {
      // Moshon: EARS pointy, sticking out a bit, matching skin color #D2A27E (clearly visible from side-view camera)
      const earLobeGeo = new THREE.SphereGeometry(0.082, 12, 10);
      earLobeGeo.scale(0.38, 1.15, 0.75);
      const earTipGeo = new THREE.ConeGeometry(0.065, 0.20, 8);
      earTipGeo.rotateZ(Math.PI / 2);
      const innerMat = this.createToonMat(0xbe8d69);

      // Left pointy ear (skin color)
      const leftEarGroup = new THREE.Group();
      const leftLobe = new THREE.Mesh(earLobeGeo, skinMat);
      leftEarGroup.add(leftLobe);

      const leftTip = new THREE.Mesh(earTipGeo, skinMat);
      leftTip.position.set(0.06, 0.09, 0);
      leftTip.rotation.set(0.12, 0.22, -0.46);
      leftEarGroup.add(leftTip);

      const leftInner = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.05), innerMat);
      leftInner.position.set(0.02, 0, 0.02);
      leftEarGroup.add(leftInner);

      leftEarGroup.position.set(headRadius * 0.90, headRadius * 0.74, -0.04);
      leftEarGroup.rotation.y = 0.22;
      leftEarGroup.rotation.z = -0.32;
      this.addOutline(leftLobe, 1.08);
      this.addOutline(leftTip, 1.08);
      head.add(leftEarGroup);

      // Right pointy ear (skin color, mirrored)
      const rightEarGroup = new THREE.Group();
      const rightLobe = new THREE.Mesh(earLobeGeo, skinMat);
      rightEarGroup.add(rightLobe);

      const rightTip = new THREE.Mesh(earTipGeo, skinMat);
      rightTip.position.set(-0.06, 0.09, 0);
      rightTip.rotation.set(0.12, -0.22, 0.46);
      rightEarGroup.add(rightTip);

      const rightInner = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.05), innerMat);
      rightInner.position.set(-0.02, 0, 0.02);
      rightEarGroup.add(rightInner);

      rightEarGroup.position.set(-headRadius * 0.90, headRadius * 0.74, -0.04);
      rightEarGroup.rotation.y = -0.22;
      rightEarGroup.rotation.z = 0.32;
      this.addOutline(rightLobe, 1.08);
      this.addOutline(rightTip, 1.08);
      head.add(rightEarGroup);
    } else if (isMatthew) {
      // Matthew: Round ears sticking out a bit
      const earGeo = new THREE.SphereGeometry(0.088, 12, 10);
      earGeo.scale(0.38, 1.12, 0.78);
      const innerEarMat = this.createToonMat(0x9a6540);

      const leftEarGroup = new THREE.Group();
      const leftEar = new THREE.Mesh(earGeo, skinMat);
      leftEarGroup.add(leftEar);
      const leftInner = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.07, 0.045), innerEarMat);
      leftInner.position.set(0.015, 0, 0.01);
      leftEarGroup.add(leftInner);
      leftEarGroup.position.set(headRadius * 0.94, headRadius * 0.74, -0.02);
      leftEarGroup.rotation.y = 0.22;
      leftEarGroup.rotation.z = -0.30;
      this.addOutline(leftEar, 1.08);
      head.add(leftEarGroup);

      const rightEarGroup = new THREE.Group();
      const rightEar = new THREE.Mesh(earGeo, skinMat);
      rightEarGroup.add(rightEar);
      const rightInner = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.07, 0.045), innerEarMat);
      rightInner.position.set(-0.015, 0, 0.01);
      rightEarGroup.add(rightInner);
      rightEarGroup.position.set(-headRadius * 0.94, headRadius * 0.74, -0.02);
      rightEarGroup.rotation.y = -0.22;
      rightEarGroup.rotation.z = 0.30;
      this.addOutline(rightEar, 1.08);
      head.add(rightEarGroup);
    }

    // Shiny specular highlight on bald head for Matthew
    if (isMatthew || app.hairStyle === 'bald') {
      const shineGeo = new THREE.SphereGeometry(0.11, 10, 10);
      shineGeo.scale(1.4, 0.65, 0.5);
      const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 });
      const shineMesh = new THREE.Mesh(shineGeo, shineMat);
      shineMesh.position.set(0.14, headRadius * 1.52, headRadius * 0.48);
      shineMesh.rotation.set(-0.35, 0.3, -0.2);
      head.add(shineMesh);
    }

    // Face Group (CanvasTexture or googly eyes, brows, nose, mouth, jaw)
    const faceGroup = new THREE.Group();
    head.add(faceGroup);

    let leftEye: THREE.Mesh;
    let rightEye: THREE.Mesh;
    let leftPupil: THREE.Mesh;
    let rightPupil: THREE.Mesh;
    let jaw: THREE.Mesh;
    let noseMesh: THREE.Mesh;
    let mouthMesh: THREE.Mesh | undefined;
    let leftEyebrow: THREE.Mesh | undefined;
    let rightEyebrow: THREE.Mesh | undefined;

    const eyeZ = headRadius * 0.82;
    const eyeY = headRadius * 0.78;

    if (isDandan) {
      // 1. Thin dark eyebrows (#1E1510), friendly arched and visible from side-view camera
      const browMatDandan = this.createToonMat(0x1e1510);
      const browGeoDandan = new THREE.BoxGeometry(0.18, 0.036, 0.07);

      leftEyebrow = new THREE.Mesh(browGeoDandan, browMatDandan);
      leftEyebrow.position.set(0.17, eyeY + 0.14, eyeZ + 0.05);
      leftEyebrow.rotation.set(0, 0.16, 0.20);
      this.addOutline(leftEyebrow, 1.08);
      faceGroup.add(leftEyebrow);

      rightEyebrow = new THREE.Mesh(browGeoDandan, browMatDandan);
      rightEyebrow.position.set(-0.17, eyeY + 0.14, eyeZ + 0.05);
      rightEyebrow.rotation.set(0, -0.16, -0.20);
      this.addOutline(rightEyebrow, 1.08);
      faceGroup.add(rightEyebrow);

      // 2. Friendly cartoon eyes with dark pupils (#1E1510) and bright highlights, clearly visible from side view
      const eyeRadiusDandan = 0.115;
      const eyeGeoDandan = new THREE.SphereGeometry(eyeRadiusDandan, 14, 14);
      const pupilGeoDandan = new THREE.SphereGeometry(0.062, 10, 10);
      const glintGeo = new THREE.SphereGeometry(0.024, 8, 8);
      const pupilMatDandan = new THREE.MeshBasicMaterial({ color: 0x1e1510 });
      const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

      // Left Eye
      leftEye = new THREE.Mesh(eyeGeoDandan, eyeWhiteMat);
      leftEye.position.set(0.17, eyeY, eyeZ);
      leftPupil = new THREE.Mesh(pupilGeoDandan, pupilMatDandan);
      leftPupil.position.set(0.01, 0, eyeRadiusDandan * 0.82);
      const leftGlint = new THREE.Mesh(glintGeo, glintMat);
      leftGlint.position.set(-0.02, 0.022, 0.055);
      leftPupil.add(leftGlint);
      leftEye.add(leftPupil);
      this.addOutline(leftEye, 1.08);
      faceGroup.add(leftEye);

      // Right Eye
      rightEye = new THREE.Mesh(eyeGeoDandan, eyeWhiteMat);
      rightEye.position.set(-0.17, eyeY, eyeZ);
      rightPupil = new THREE.Mesh(pupilGeoDandan, pupilMatDandan);
      rightPupil.position.set(-0.01, 0, eyeRadiusDandan * 0.82);
      const rightGlint = new THREE.Mesh(glintGeo, glintMat);
      rightGlint.position.set(0.02, 0.022, 0.055);
      rightPupil.add(rightGlint);
      rightEye.add(rightPupil);
      this.addOutline(rightEye, 1.08);
      faceGroup.add(rightEye);

      // 3. BIG wide smile showing teeth, wrapping around cheeks so it is prominently visible from side-view camera
      const smileGroup = new THREE.Group();
      const mouthCavityMat = new THREE.MeshBasicMaterial({ color: 0x240608 });
      const teethMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const smileLineMat = this.createToonMat(0x1e1510);

      // Smile mouth cavity opening
      const mouthCavityGeo = new THREE.BoxGeometry(0.34, 0.13, 0.12);
      const mouthCavity = new THREE.Mesh(mouthCavityGeo, mouthCavityMat);
      mouthCavity.position.set(0, eyeY - 0.28, eyeZ + 0.01);
      smileGroup.add(mouthCavity);

      // Wide upper row of bright white teeth clearly showing and wrapping around the smile
      const teethGeo = new THREE.BoxGeometry(0.30, 0.075, 0.10);
      const teethMesh = new THREE.Mesh(teethGeo, teethMat);
      teethMesh.position.set(0, eyeY - 0.26, eyeZ + 0.035);
      this.addOutline(teethMesh, 1.06);
      smileGroup.add(teethMesh);

      // Cheerful smiling corners curling upward onto cheeks for prominent side-camera visibility
      const leftSmileCorner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.10), smileLineMat);
      leftSmileCorner.position.set(0.18, eyeY - 0.24, eyeZ - 0.01);
      leftSmileCorner.rotation.z = 0.35;
      smileGroup.add(leftSmileCorner);

      const rightSmileCorner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.10), smileLineMat);
      rightSmileCorner.position.set(-0.18, eyeY - 0.24, eyeZ - 0.01);
      rightSmileCorner.rotation.z = -0.35;
      smileGroup.add(rightSmileCorner);

      mouthMesh = mouthCavity;
      faceGroup.add(smileGroup);

      // 4. Jaw / Chin base
      const jawGeoDandan = new THREE.BoxGeometry(0.40, 0.16, 0.26);
      jaw = new THREE.Mesh(jawGeoDandan, skinMat);
      jaw.position.set(0, headRadius * 0.2, headRadius * 0.72);
      this.addOutline(jaw, 1.06);
      faceGroup.add(jaw);

      // 5. Funny big nose: skin-colored cone pointing forward, exactly as is
      const noseRadius = 0.135;
      const noseLen = 0.44;
      const coneGeo = new THREE.ConeGeometry(noseRadius, noseLen, 16);
      coneGeo.rotateX(Math.PI / 2); // Cone points forward along +Z
      coneGeo.translate(0, 0, noseLen * 0.5); // Base at Z=0, tip extending forward in +Z
      noseMesh = new THREE.Mesh(coneGeo, skinMat);
      const noseY = headRadius * 0.75 - 0.08;
      const noseZ = headRadius * 0.94;
      noseMesh.position.set(0, noseY, noseZ);
      this.addOutline(noseMesh, 1.08);
      head.add(noseMesh);
    } else if (isMatthew) {
      // Matthew "The Terrifying": Round friendly face, no mustache, jawline & chin stubble only
      // 1. Thick dark eyebrows (#1A120B)
      const browMatMatthew = this.createToonMat(0x1a120b);
      const browGeoMatthew = new THREE.BoxGeometry(0.20, 0.065, 0.08);

      leftEyebrow = new THREE.Mesh(browGeoMatthew, browMatMatthew);
      leftEyebrow.position.set(0.17, eyeY + 0.15, eyeZ + 0.05);
      this.addOutline(leftEyebrow, 1.08);
      faceGroup.add(leftEyebrow);

      rightEyebrow = new THREE.Mesh(browGeoMatthew, browMatMatthew);
      rightEyebrow.position.set(-0.17, eyeY + 0.15, eyeZ + 0.05);
      this.addOutline(rightEyebrow, 1.08);
      faceGroup.add(rightEyebrow);

      // 2. Dark brown friendly eyes (#2E1808) with bright white highlights
      const eyeRadiusMatthew = 0.12;
      const eyeGeoMatthew = new THREE.SphereGeometry(eyeRadiusMatthew, 14, 14);
      const pupilGeoMatthew = new THREE.SphereGeometry(0.065, 10, 10);
      const glintGeo = new THREE.SphereGeometry(0.024, 8, 8);
      const pupilMatMatthew = new THREE.MeshBasicMaterial({ color: 0x2e1808 });
      const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

      // Left Eye
      leftEye = new THREE.Mesh(eyeGeoMatthew, eyeWhiteMat);
      leftEye.position.set(0.17, eyeY, eyeZ);
      leftPupil = new THREE.Mesh(pupilGeoMatthew, pupilMatMatthew);
      leftPupil.position.set(0.01, 0, eyeRadiusMatthew * 0.82);
      const leftGlint = new THREE.Mesh(glintGeo, glintMat);
      leftGlint.position.set(-0.02, 0.022, 0.055);
      leftPupil.add(leftGlint);
      leftEye.add(leftPupil);
      this.addOutline(leftEye, 1.08);
      faceGroup.add(leftEye);

      // Right Eye
      rightEye = new THREE.Mesh(eyeGeoMatthew, eyeWhiteMat);
      rightEye.position.set(-0.17, eyeY, eyeZ);
      rightPupil = new THREE.Mesh(pupilGeoMatthew, pupilMatMatthew);
      rightPupil.position.set(-0.01, 0, eyeRadiusMatthew * 0.82);
      const rightGlint = new THREE.Mesh(glintGeo, glintMat);
      rightGlint.position.set(0.02, 0.022, 0.055);
      rightPupil.add(rightGlint);
      rightEye.add(rightPupil);
      this.addOutline(rightEye, 1.08);
      faceGroup.add(rightEye);

      // 3. Round full cheeks
      const cheekGeo = new THREE.SphereGeometry(0.12, 10, 10);
      cheekGeo.scale(1.1, 0.85, 0.6);
      const leftCheek = new THREE.Mesh(cheekGeo, skinMat);
      leftCheek.position.set(0.24, eyeY - 0.14, eyeZ - 0.02);
      faceGroup.add(leftCheek);
      const rightCheek = new THREE.Mesh(cheekGeo, skinMat);
      rightCheek.position.set(-0.24, eyeY - 0.14, eyeZ - 0.02);
      faceGroup.add(rightCheek);

      // 4. Broad friendly nose (skin tone #B07850)
      const noseGeoMatthew = new THREE.BoxGeometry(0.17, 0.13, 0.13);
      noseMesh = new THREE.Mesh(noseGeoMatthew, skinMat);
      noseMesh.position.set(0, eyeY - 0.14, eyeZ + 0.08);
      this.addOutline(noseMesh, 1.08);
      faceGroup.add(noseMesh);

      // 5. Small mole on cheek next to the nose
      const moleMat = this.createToonMat(0x1a120b);
      const moleMesh = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), moleMat);
      moleMesh.scale.set(1, 1, 0.5);
      moleMesh.position.set(0.13, eyeY - 0.13, eyeZ + 0.09);
      faceGroup.add(moleMesh);

      // 6. Very big wide smile with big white teeth
      // STRICT RULE: Area between nose and upper lip is 100% clean skin - NO mustache!
      const smileGroup = new THREE.Group();
      const mouthCavityMat = new THREE.MeshBasicMaterial({ color: 0x240608 });
      const teethMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const smileLineMat = this.createToonMat(0x1a120b);

      // Mouth cavity
      const mouthCavityGeo = new THREE.BoxGeometry(0.34, 0.14, 0.12);
      const mouthCavity = new THREE.Mesh(mouthCavityGeo, mouthCavityMat);
      mouthCavity.position.set(0, eyeY - 0.30, eyeZ + 0.01);
      smileGroup.add(mouthCavity);

      // Big bright white upper teeth
      const upperTeethGeo = new THREE.BoxGeometry(0.30, 0.07, 0.10);
      const upperTeeth = new THREE.Mesh(upperTeethGeo, teethMat);
      upperTeeth.position.set(0, eyeY - 0.275, eyeZ + 0.035);
      this.addOutline(upperTeeth, 1.06);
      smileGroup.add(upperTeeth);

      // Lower white teeth
      const lowerTeethGeo = new THREE.BoxGeometry(0.24, 0.045, 0.09);
      const lowerTeeth = new THREE.Mesh(lowerTeethGeo, teethMat);
      lowerTeeth.position.set(0, eyeY - 0.345, eyeZ + 0.03);
      smileGroup.add(lowerTeeth);

      // Cheerful smiling corners curling upward
      const leftSmileCorner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.10), smileLineMat);
      leftSmileCorner.position.set(0.19, eyeY - 0.26, eyeZ - 0.01);
      leftSmileCorner.rotation.z = 0.35;
      smileGroup.add(leftSmileCorner);

      const rightSmileCorner = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.10), smileLineMat);
      rightSmileCorner.position.set(-0.19, eyeY - 0.26, eyeZ - 0.01);
      rightSmileCorner.rotation.z = -0.35;
      smileGroup.add(rightSmileCorner);

      mouthMesh = mouthCavity;
      faceGroup.add(smileGroup);

      // 7. Full round jaw base
      const jawGeoMatthew = new THREE.BoxGeometry(0.44, 0.18, 0.28);
      jaw = new THREE.Mesh(jawGeoMatthew, skinMat);
      jaw.position.set(0, headRadius * 0.18, headRadius * 0.72);
      this.addOutline(jaw, 1.06);
      faceGroup.add(jaw);

      // 8. Short dark stubble beard strictly along jawline and chin (NO MUSTACHE, clean philtrum)
      const stubbleMatMatthew = this.createToonMat(0x1a120b);
      const matthewBeardGroup = new THREE.Group();

      // Jawline stubble wrap (sides and bottom edge of jaw)
      const jawStubble = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.18, 0.32), stubbleMatMatthew);
      jawStubble.position.set(0, headRadius * 0.12, headRadius * 0.62);
      this.addOutline(jawStubble, 1.05);
      matthewBeardGroup.add(jawStubble);

      // Chin stubble pad (at very bottom of chin, well below mouth)
      const chinStubble = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.14), stubbleMatMatthew);
      chinStubble.position.set(0, headRadius * 0.10, headRadius * 0.78);
      this.addOutline(chinStubble, 1.05);
      matthewBeardGroup.add(chinStubble);

      faceGroup.add(matthewBeardGroup);
    } else {
      // Large Cartoon Googly Eyes
      const eyeRadius = 0.13;
      const eyeGeo = new THREE.SphereGeometry(eyeRadius, 14, 14);
      const pupilGeo = new THREE.SphereGeometry(0.065, 10, 10);
      const eyeZ = headRadius * 0.82;
      const eyeY = headRadius * 0.78;

      leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      leftEye.position.set(0.18, eyeY, eyeZ);
      leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
      leftPupil.position.set(0, 0, eyeRadius * 0.8);
      leftEye.add(leftPupil);
      this.addOutline(leftEye, 1.08);
      faceGroup.add(leftEye);

      rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
      rightEye.position.set(-0.18, eyeY, eyeZ);
      rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
      rightPupil.position.set(0, 0, eyeRadius * 0.8);
      rightEye.add(rightPupil);
      this.addOutline(rightEye, 1.08);
      faceGroup.add(rightEye);

      // Eyebrows
      const ebStyle = app.eyebrows || 'thick';
      const browGeo = new THREE.BoxGeometry(0.22, 0.07, 0.08);
      leftEyebrow = new THREE.Mesh(browGeo, browMat);
      rightEyebrow = new THREE.Mesh(browGeo, browMat);

      if (ebStyle === 'angry') {
        leftEyebrow.position.set(0.18, eyeY + 0.16, eyeZ + 0.04);
        leftEyebrow.rotation.z = -0.32;
        rightEyebrow.position.set(-0.18, eyeY + 0.16, eyeZ + 0.04);
        rightEyebrow.rotation.z = 0.32;
      } else if (ebStyle === 'arched') {
        leftEyebrow.position.set(0.18, eyeY + 0.18, eyeZ + 0.04);
        leftEyebrow.rotation.z = 0.2;
        rightEyebrow.position.set(-0.18, eyeY + 0.18, eyeZ + 0.04);
        rightEyebrow.rotation.z = -0.2;
      } else {
        leftEyebrow.position.set(0.18, eyeY + 0.16, eyeZ + 0.04);
        rightEyebrow.position.set(-0.18, eyeY + 0.16, eyeZ + 0.04);
      }
      this.addOutline(leftEyebrow, 1.08);
      this.addOutline(rightEyebrow, 1.08);
      faceGroup.add(leftEyebrow);
      faceGroup.add(rightEyebrow);

      // Nose
      const nShape = isMoshon ? 'pointy' : (app.noseShape || 'broad');
      let nScale = app.noseSize === 'large' ? 1.35 : app.noseSize === 'small' ? 0.7 : 1.0;
      let noseGeo: THREE.BufferGeometry;
      if (isMoshon) {
        // Straight defined nose bridge with rounded tip for Moshon
        noseGeo = new THREE.BoxGeometry(0.12, 0.20, 0.16);
      } else if (nShape === 'button') {
        noseGeo = new THREE.SphereGeometry(0.08 * nScale, 10, 10);
      } else if (nShape === 'pointy') {
        noseGeo = new THREE.ConeGeometry(0.07 * nScale, 0.2 * nScale, 6);
      } else if (nShape === 'hook') {
        noseGeo = new THREE.BoxGeometry(0.1 * nScale, 0.18 * nScale, 0.14 * nScale);
      } else {
        // broad boxer nose
        noseGeo = new THREE.BoxGeometry(0.16 * nScale, 0.12 * nScale, 0.12 * nScale);
      }
      noseMesh = new THREE.Mesh(noseGeo, skinMat);
      noseMesh.position.set(0, eyeY - 0.15, eyeZ + 0.08);
      if (nShape === 'pointy' && !isMoshon) noseMesh.rotation.x = Math.PI / 2;
      this.addOutline(noseMesh, 1.08);
      faceGroup.add(noseMesh);

      // Mouth
      const mType = app.mouth || 'smile';
      if (mType === 'grin') {
        mouthMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.05), toothMat);
      } else if (mType === 'serious') {
        mouthMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.05), mouthMat);
      } else if (mType === 'open') {
        mouthMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8), mouthMat);
        mouthMesh.rotation.x = Math.PI / 2;
      } else {
        // smile
        mouthMesh = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 6, 12, Math.PI), mouthMat);
        mouthMesh.rotation.z = Math.PI;
      }
      mouthMesh.position.set(0, eyeY - 0.32, eyeZ + 0.04);
      faceGroup.add(mouthMesh);

      // Jaw / Chin
      const jawGeo = new THREE.BoxGeometry(0.42, 0.18, 0.28);
      jaw = new THREE.Mesh(jawGeo, skinMat);
      jaw.position.set(0, headRadius * 0.2, headRadius * 0.72);
      this.addOutline(jaw, 1.06);
      faceGroup.add(jaw);

      // Beard
      if (isMoshon) {
        // Short full dark brown beard and mustache (#2A1C14) for Moshon (accurate to photo reference)
        const beardMat = this.createToonMat(0x2a1c14);
        const moshonBeardGroup = new THREE.Group();

        // 1. Jawline & chin wrap (neatly trimmed full beard, clearly visible in profile and front)
        const jawWrapGeo = new THREE.BoxGeometry(0.52, 0.22, 0.38);
        const jawWrap = new THREE.Mesh(jawWrapGeo, beardMat);
        jawWrap.position.set(0, headRadius * 0.15, headRadius * 0.60);
        this.addOutline(jawWrap, 1.06);
        moshonBeardGroup.add(jawWrap);

        // 2. Chin front full beard protrusion
        const chinBeard = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.18), beardMat);
        chinBeard.position.set(0, headRadius * 0.14, headRadius * 0.76);
        this.addOutline(chinBeard, 1.06);
        moshonBeardGroup.add(chinBeard);

        // 3. Trimmed mustache connecting across upper lip
        const mustacheGeo = new THREE.BoxGeometry(0.32, 0.08, 0.11);
        const mustache = new THREE.Mesh(mustacheGeo, beardMat);
        mustache.position.set(0, headRadius * 0.44, headRadius * 0.82);
        this.addOutline(mustache, 1.06);
        moshonBeardGroup.add(mustache);

        // 4. Sideburns connecting up into neat hair
        const leftSideburn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.12), beardMat);
        leftSideburn.position.set(headRadius * 0.82, headRadius * 0.54, headRadius * 0.08);
        moshonBeardGroup.add(leftSideburn);

        const rightSideburn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.12), beardMat);
        rightSideburn.position.set(-headRadius * 0.82, headRadius * 0.54, headRadius * 0.08);
        moshonBeardGroup.add(rightSideburn);

        faceGroup.add(moshonBeardGroup);
      } else if (app.beard === 'full') {
        const beardGeo = new THREE.BoxGeometry(0.58, 0.32, 0.38);
        const beardMesh = new THREE.Mesh(beardGeo, hairMat);
        beardMesh.position.set(0, headRadius * 0.12, headRadius * 0.7);
        this.addOutline(beardMesh, 1.06);
        faceGroup.add(beardMesh);
      } else if (app.beard === 'goatee') {
        const goatee = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.14), hairMat);
        goatee.position.set(0, headRadius * 0.1, headRadius * 0.82);
        this.addOutline(goatee, 1.06);
        faceGroup.add(goatee);
      } else if (app.beard === 'stubble') {
        const stubbleMat = this.createToonMat(0x451a03);
        const stubble = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.3), stubbleMat);
        stubble.position.set(0, headRadius * 0.18, headRadius * 0.73);
        faceGroup.add(stubble);
      }
    }

    // Progressive Face Damage 3D Meshes & Dynamic Canvas Texture
    // Visible as health drops: 60% bruise, 40% black eye, 20% bleeding nose & cut on eyebrow
    const damageGroup = new THREE.Group();
    faceGroup.add(damageGroup);

    // 1. Bruise at 60% health: Purplish soft bruise patch on the cheek
    const bruiseMat = new THREE.MeshBasicMaterial({
      color: 0x581c87,
      transparent: true,
      opacity: 0.85,
    });
    const bruiseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), bruiseMat);
    bruiseMesh.scale.set(1.4, 0.9, 0.25);
    bruiseMesh.position.set(0.22, eyeY - 0.16, eyeZ + 0.05);
    bruiseMesh.visible = false;
    damageGroup.add(bruiseMesh);

    // 2. Black Eye at 40% health: Dark purple/black shiner ring around eye
    const blackEyeMat = new THREE.MeshBasicMaterial({
      color: 0x2e1065,
      transparent: true,
      opacity: 0.92,
    });
    const blackEyeMesh = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.055, 8, 16), blackEyeMat);
    blackEyeMesh.position.set(0.17, eyeY, eyeZ + 0.05);
    blackEyeMesh.visible = false;
    damageGroup.add(blackEyeMesh);

    // 3. Bleeding nose at 20% health: Bright red cartoon drip trickling down from nose
    const noseBleedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const bleedingNoseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.034, 0.16, 8), noseBleedMat);
    bleedingNoseMesh.position.set(0.04, eyeY - 0.22, eyeZ + 0.12);
    bleedingNoseMesh.rotation.z = -0.15;
    bleedingNoseMesh.visible = false;
    damageGroup.add(bleedingNoseMesh);

    // 4. Cut on eyebrow at 20% health: Red slash cut across eyebrow
    const cutMat = new THREE.MeshBasicMaterial({ color: 0xb91c1c });
    const eyebrowCutMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.024, 0.04), cutMat);
    eyebrowCutMesh.position.set(-0.18, eyeY + 0.19, eyeZ + 0.07);
    eyebrowCutMesh.rotation.z = 0.35;
    eyebrowCutMesh.visible = false;
    damageGroup.add(eyebrowCutMesh);

    // Face Damage Canvas Texture (redrawn dynamically on health changes)
    const faceDamageCanvas = document.createElement('canvas');
    faceDamageCanvas.width = 256;
    faceDamageCanvas.height = 256;
    const faceDamageCtx = faceDamageCanvas.getContext('2d') || undefined;
    const faceDamageTexture = new THREE.CanvasTexture(faceDamageCanvas);
    const faceDamageDecalGeo = new THREE.PlaneGeometry(headRadius * 1.5, headRadius * 1.5);
    const faceDamageDecalMat = new THREE.MeshBasicMaterial({
      map: faceDamageTexture,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const faceDamageDecal = new THREE.Mesh(faceDamageDecalGeo, faceDamageDecalMat);
    faceDamageDecal.position.set(0, eyeY - 0.08, eyeZ + 0.04);
    damageGroup.add(faceDamageDecal);

    // Dazed circling stars over the head after a knockdown
    const dazedStarsGroup = new THREE.Group();
    dazedStarsGroup.position.set(0, headRadius * 1.8 + 0.15, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const starCount = 3;
    for (let s = 0; s < starCount; s++) {
      const angle = (s / starCount) * Math.PI * 2;
      const starGeo = new THREE.OctahedronGeometry(0.09, 0);
      starGeo.scale(1.2, 1.2, 0.4);
      const starMesh = new THREE.Mesh(starGeo, starMat);
      starMesh.position.set(Math.cos(angle) * 0.34, Math.sin(s * 1.5) * 0.05, Math.sin(angle) * 0.34);
      this.addOutline(starMesh, 1.15);
      dazedStarsGroup.add(starMesh);
    }
    dazedStarsGroup.rotation.x = 0.25;
    dazedStarsGroup.visible = false;
    head.add(dazedStarsGroup);

    // Cartoon tear streams from the eyes below 20% health
    const tearStreamsGroup = new THREE.Group();
    const tearStreamMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.90,
    });
    const leftTearStream = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.02), tearStreamMat);
    leftTearStream.position.set(0.17, eyeY - 0.13, eyeZ + 0.05);
    tearStreamsGroup.add(leftTearStream);
    const rightTearStream = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.02), tearStreamMat);
    rightTearStream.position.set(-0.17, eyeY - 0.13, eyeZ + 0.05);
    tearStreamsGroup.add(rightTearStream);
    tearStreamsGroup.visible = false;
    faceGroup.add(tearStreamsGroup);

    // Hair Styles
    const hairGroup = new THREE.Group();
    head.add(hairGroup);
    const hStyle = app.hairStyle;
    if (isMoshon) {
      // Moshon: Rebuild hair as a thin cap only on the top and back of the head, never covering the face.
      // His face (skin #D2A27E), glasses, beard and pointy ears are clearly visible.
      const hairMatMoshon = this.createToonMat(0x2a1c14);

      const uSegments = 24;
      const vSegments = 16;
      const positions: number[] = [];
      const normals: number[] = [];
      const indices: number[] = [];

      const hY = headRadius * 0.75;
      const r = headRadius * 1.006; // Thin form-fitting cap layer over head
      const scaleX = 0.884;
      const scaleY = 1.164;
      const scaleZ = 0.944;

      for (let j = 0; j <= vSegments; j++) {
        const v = j / vSegments;
        for (let i = 0; i <= uSegments; i++) {
          const u = (i / uSegments) * Math.PI * 2;
          const phi = u;
          // In Three.js: sin(phi) gives Z coordinate (+Z = front face, -Z = back of head)
          const sinP = Math.sin(phi);
          const cosP = Math.cos(phi);

          // Calculate maximum latitude thetaMax for this azimuth phi:
          // Front of head (sinP > 0): hairline stays high on crown/forehead (thetaMax ~ 0.18*PI), never reaching forehead/face
          // Sides (above ears): thetaMax ~ 0.38*PI
          // Back of head (sinP < 0): hair covers down the back of head to nape of neck (thetaMax ~ 0.62*PI)
          let thetaMax: number;
          if (sinP >= 0) {
            // Front / Forehead region: high, neat hairline
            thetaMax = (0.38 - sinP * 0.20) * Math.PI;
          } else {
            // Back / Nape region: full coverage down to neck
            thetaMax = (0.38 - sinP * 0.24) * Math.PI;
          }

          const theta = v * thetaMax;
          const sinT = Math.sin(theta);
          const cosT = Math.cos(theta);

          const nx = -cosP * sinT;
          const ny = cosT;
          const nz = sinP * sinT;

          const px = nx * r * scaleX;
          const py = hY + ny * r * scaleY;
          const pz = nz * r * scaleZ;

          positions.push(px, py, pz);
          normals.push(nx, ny, nz);
        }
      }

      for (let j = 0; j < vSegments; j++) {
        for (let i = 0; i < uSegments; i++) {
          const a = j * (uSegments + 1) + i;
          const b = (j + 1) * (uSegments + 1) + i;
          const c = (j + 1) * (uSegments + 1) + (i + 1);
          const d = j * (uSegments + 1) + (i + 1);

          indices.push(a, b, d);
          indices.push(b, c, d);
        }
      }

      const hairCapGeo = new THREE.BufferGeometry();
      hairCapGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      hairCapGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      hairCapGeo.setIndex(indices);
      hairCapGeo.computeVertexNormals();

      const hairCap = new THREE.Mesh(hairCapGeo, hairMatMoshon);
      hairGroup.add(hairCap);
    } else if (hStyle === 'headband') {
      const bandGeo = new THREE.BoxGeometry(headRadius * 1.85, 0.16, headRadius * 1.8);
      const band = new THREE.Mesh(bandGeo, secondaryMat);
      band.position.set(0, headRadius * 0.95, 0);
      this.addOutline(band, 1.06);
      hairGroup.add(band);

      // Ribbon tails
      const knot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 0.1), secondaryMat);
      knot.position.set(-headRadius * 0.85, headRadius * 0.85, -headRadius * 0.75);
      this.addOutline(knot, 1.06);
      hairGroup.add(knot);

      // Hair tufts poking out
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 6), hairMat);
      tuft.position.set(0, headRadius * 1.4, 0);
      hairGroup.add(tuft);
    } else if (hStyle === 'spiky') {
      // Golden Spiky Anime Hair
      for (let s = -2; s <= 2; s++) {
        const spikeGeo = new THREE.ConeGeometry(0.16, 0.48, 6);
        const spike = new THREE.Mesh(spikeGeo, hairMat);
        spike.position.set(s * 0.16, headRadius * 1.42, (Math.random() - 0.5) * 0.15);
        spike.rotation.z = -s * 0.28;
        this.addOutline(spike, 1.08);
        hairGroup.add(spike);
      }
    } else if (hStyle === 'faux-hawk' || isDandan) {
      // Sides shaved almost bald: flush with the oval head, subtle shaved fade tone (#5C3722) over deep dark brown skin (#7A4A2E), zero hair volume
      const shavedMat = this.createToonMat(0x5c3722);

      // Left shaved side (flush with oval head, zero hair volume)
      const leftShavedGeo = new THREE.SphereGeometry(
        headRadius * 1.006,
        16,
        14,
        Math.PI * 0.76,
        Math.PI * 0.62,
        Math.PI * 0.14,
        Math.PI * 0.54
      );
      leftShavedGeo.scale(0.88, 1.18, 0.94);
      const leftShaved = new THREE.Mesh(leftShavedGeo, shavedMat);
      leftShaved.position.set(0, headRadius * 0.75, 0);
      hairGroup.add(leftShaved);

      // Right shaved side (flush with oval head, zero hair volume)
      const rightShavedGeo = new THREE.SphereGeometry(
        headRadius * 1.006,
        16,
        14,
        -Math.PI * 0.38,
        Math.PI * 0.62,
        Math.PI * 0.14,
        Math.PI * 0.54
      );
      rightShavedGeo.scale(0.88, 1.18, 0.94);
      const rightShaved = new THREE.Mesh(rightShavedGeo, shavedMat);
      rightShaved.position.set(0, headRadius * 0.75, 0);
      hairGroup.add(rightShaved);

      // Single neat faux-hawk strip: narrow, tall, running front to back in dark (#1E1510)
      const hawkGroup = new THREE.Group();
      const hawkMat = this.createToonMat(0x1e1510);
      const segments = 12;
      for (let i = 0; i < segments; i++) {
        const t = i / (segments - 1);
        const angle = Math.PI * 0.44 - t * Math.PI * 0.86; // neat continuous strip from forehead to back of head
        const sinA = Math.sin(angle);
        const cosA = Math.cos(angle);

        const baseZ = headRadius * 0.94 * sinA;
        const baseY = headRadius * 0.75 + headRadius * 1.18 * cosA;

        // Tall narrow ridge, rising neatly along the sagittal crest
        const ridgeH = 0.28 * Math.sin(Math.PI * (0.16 + t * 0.68));
        const segDepth = 0.13;
        const segWidth = 0.092; // single neat narrow strip

        const wedgeGeo = new THREE.BoxGeometry(segWidth, ridgeH, segDepth);
        const wedge = new THREE.Mesh(wedgeGeo, hawkMat);
        wedge.position.set(0, baseY + ridgeH * 0.46 * Math.max(0.25, cosA), baseZ + ridgeH * 0.22 * sinA);
        wedge.rotation.x = -angle + Math.PI / 2;
        this.addOutline(wedge, 1.08);
        hawkGroup.add(wedge);
      }
      hairGroup.add(hawkGroup);
    } else if (hStyle === 'short') {
      const capGeo = new THREE.SphereGeometry(headRadius * 1.06, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const cap = new THREE.Mesh(capGeo, hairMat);
      cap.position.set(0, headRadius * 0.75, 0);
      hairGroup.add(cap);
    } else if (hStyle === 'afro') {
      const afroGeo = new THREE.SphereGeometry(headRadius * 1.35, 14, 14);
      const afro = new THREE.Mesh(afroGeo, hairMat);
      afro.position.set(0, headRadius * 1.15, 0);
      this.addOutline(afro, 1.06);
      hairGroup.add(afro);
    } else if (hStyle === 'curly') {
      for (let i = 0; i < 7; i++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), hairMat);
        const angle = (i / 7) * Math.PI * 2;
        puff.position.set(Math.cos(angle) * 0.25, headRadius * 1.35, Math.sin(angle) * 0.25);
        hairGroup.add(puff);
      }
    } else if (hStyle === 'long') {
      const strandGeo = new THREE.BoxGeometry(headRadius * 1.4, 0.65, 0.22);
      const strand = new THREE.Mesh(strandGeo, hairMat);
      strand.position.set(0, headRadius * 0.4, -headRadius * 0.85);
      hairGroup.add(strand);
    }

    // Glasses / Shades Accessory (thick black rectangular glasses with side temples for side-view clarity)
    let glassesGlowMesh: THREE.Mesh | undefined;
    if (acc === 'glasses' || isMoshon) {
      const glassesGroup = new THREE.Group();
      const shadesMat = new THREE.MeshBasicMaterial({ color: 0x09090b });
      const glassLensMat = new THREE.MeshBasicMaterial({ color: 0xcffafe, transparent: true, opacity: 0.40 });

      // Left lens frame & glass
      const leftRim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.06), shadesMat);
      leftRim.position.set(0.17, 0, 0);
      this.addOutline(leftRim, 1.08);
      glassesGroup.add(leftRim);

      const leftGlass = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.02), glassLensMat);
      leftGlass.position.set(0.17, 0, 0.02);
      glassesGroup.add(leftGlass);

      // Right lens frame & glass
      const rightRim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.06), shadesMat);
      rightRim.position.set(-0.17, 0, 0);
      this.addOutline(rightRim, 1.08);
      glassesGroup.add(rightRim);

      const rightGlass = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.02), glassLensMat);
      rightGlass.position.set(-0.17, 0, 0.02);
      glassesGroup.add(rightGlass);

      // Center bridge
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.05), shadesMat);
      bridge.position.set(0, 0.02, 0);
      glassesGroup.add(bridge);

      // Glowing blue lenses for OVERCLOCKED buff
      const glowGeo = new THREE.BoxGeometry(0.60, 0.18, 0.04);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 });
      glassesGlowMesh = new THREE.Mesh(glowGeo, glowMat);
      glassesGlowMesh.position.set(0, 0, 0.04);
      glassesGlowMesh.visible = false;
      glassesGroup.add(glassesGlowMesh);

      // Side temple arms (running along left & right sides of head to pointy ears for side camera visibility)
      const templeLen = headRadius * 0.92;
      const leftTemple = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, templeLen), shadesMat);
      leftTemple.position.set(0.29, 0.02, -templeLen * 0.5);
      this.addOutline(leftTemple, 1.08);
      glassesGroup.add(leftTemple);

      const rightTemple = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, templeLen), shadesMat);
      rightTemple.position.set(-0.29, 0.02, -templeLen * 0.5);
      this.addOutline(rightTemple, 1.08);
      glassesGroup.add(rightTemple);

      const glassesY = headRadius * 0.78;
      const glassesZ = headRadius * 0.82;
      glassesGroup.position.set(0, glassesY, glassesZ + 0.12);
      faceGroup.add(glassesGroup);
    }

    // Hat Accessory
    if (acc === 'hat') {
      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(headRadius * 1.4, headRadius * 1.4, 0.06, 16), secondaryMat);
      hatBrim.position.set(0, headRadius * 1.4, 0);
      head.add(hatBrim);
      const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(headRadius * 0.85, headRadius * 0.95, 0.35, 16), secondaryMat);
      hatCrown.position.set(0, headRadius * 1.55, 0);
      this.addOutline(hatCrown, 1.06);
      head.add(hatCrown);
    }

    // 7. Left Arm Hierarchy (Shoulder -> UpperArm -> Elbow -> Forearm -> Wrist -> Hand)
    const leftShoulder = new THREE.Group();
    leftShoulder.position.set(torsoW * 0.52, torsoH * 0.82, 0);
    spine.add(leftShoulder);

    const upperArmMat = (app.shirtType === 'tshirt' || app.shirtType === 'gi' || isMoshon) ? shirtMat : skinMat;
    const leftUpperArmGeo = new THREE.CylinderGeometry(armThickness * 1.1, armThickness, upperArmLen, 10);
    const leftUpperArm = new THREE.Mesh(leftUpperArmGeo, upperArmMat);
    leftUpperArm.position.y = -upperArmLen * 0.5;
    leftUpperArm.castShadow = true;
    this.addOutline(leftUpperArm, 1.08);
    leftShoulder.add(leftUpperArm);

    if (isMoshon) {
      // Dark slate gray stripe running down outer upper arm
      const armStripeMat = this.createToonMat(0x334155);
      const leftStripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, upperArmLen * 0.88, armThickness * 0.95), armStripeMat);
      leftStripe.position.set(armThickness * 0.55, -upperArmLen * 0.5, 0);
      this.addOutline(leftStripe, 1.06);
      leftShoulder.add(leftStripe);
    }

    // Left Elbow Joint (pivot at bottom of upper arm)
    const leftElbow = new THREE.Group();
    leftElbow.position.set(0, -upperArmLen, 0);
    leftShoulder.add(leftElbow);

    const forearmMat = isMoshon ? shirtMat : skinMat;
    const leftForearmGeo = new THREE.CylinderGeometry(armThickness, armThickness * 1.05, forearmLen, 10);
    const leftForearm = new THREE.Mesh(leftForearmGeo, forearmMat);
    leftForearm.position.y = -forearmLen * 0.5;
    leftForearm.castShadow = true;
    this.addOutline(leftForearm, 1.08);
    leftElbow.add(leftForearm);

    // Left Wrist Joint (pivot at bottom of forearm)
    const leftWrist = new THREE.Group();
    leftWrist.position.set(0, -forearmLen, 0);
    leftElbow.add(leftWrist);

    // Left Hand Group
    const leftHand = new THREE.Group();
    leftWrist.add(leftHand);

    // Glove / Hand Geometry
    const gloveSize = (bType === 'heavy' || bType === 'bulky') ? 0.28 : 0.23;
    const gType = app.gloveType || 'boxing_gloves';
    let leftGloveMesh: THREE.Mesh;
    if (gType === 'hand_wraps') {
      const wrapGeo = new THREE.CylinderGeometry(armThickness * 1.35, armThickness * 1.25, 0.32, 10);
      leftGloveMesh = new THREE.Mesh(wrapGeo, gloveMat);
      leftGloveMesh.position.set(0, -0.16, 0.04);
    } else if (gType === 'work_gloves') {
      // White work gloves with red cuffs
      const gloveGeo = new THREE.BoxGeometry(0.24, 0.28, 0.24);
      leftGloveMesh = new THREE.Mesh(gloveGeo, gloveMat);
      leftGloveMesh.position.set(0, -0.14, 0.04);
      const redCuffMat = this.createToonMat(app.cuffColor ?? 0xef4444);
      const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.26), redCuffMat);
      cuff.position.set(0, 0.05, 0.04);
      this.addOutline(cuff, 1.08);
      leftHand.add(cuff);
    } else if (gType === 'bare_hands' || isMoshon) {
      const fistGeo = new THREE.SphereGeometry(armThickness * 1.3, 10, 10);
      leftGloveMesh = new THREE.Mesh(fistGeo, skinMat);
      leftGloveMesh.position.set(0, -armThickness * 0.9, 0.02);
    } else {
      // Big Boxing Gloves (chunky cartoon silhouette)
      const leftGloveGeo = new THREE.SphereGeometry(gloveSize, 14, 14);
      leftGloveMesh = new THREE.Mesh(leftGloveGeo, gloveMat);
      leftGloveMesh.position.set(0, -gloveSize * 0.45, gloveSize * 0.3);
    }
    leftGloveMesh.castShadow = true;
    this.addOutline(leftGloveMesh, 1.07);
    leftHand.add(leftGloveMesh);

    // 8. Right Arm Hierarchy (Shoulder -> UpperArm -> Elbow -> Forearm -> Wrist -> Hand)
    const rightShoulder = new THREE.Group();
    rightShoulder.position.set(-torsoW * 0.52, torsoH * 0.82, 0);
    spine.add(rightShoulder);

    const rightUpperArm = new THREE.Mesh(leftUpperArmGeo, upperArmMat);
    rightUpperArm.position.y = -upperArmLen * 0.5;
    rightUpperArm.castShadow = true;
    this.addOutline(rightUpperArm, 1.08);
    rightShoulder.add(rightUpperArm);

    if (isMoshon) {
      const armStripeMat = this.createToonMat(0x334155);
      const rightStripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, upperArmLen * 0.88, armThickness * 0.95), armStripeMat);
      rightStripe.position.set(-armThickness * 0.55, -upperArmLen * 0.5, 0);
      this.addOutline(rightStripe, 1.06);
      rightShoulder.add(rightStripe);
    }

    // Right Elbow Joint
    const rightElbow = new THREE.Group();
    rightElbow.position.set(0, -upperArmLen, 0);
    rightShoulder.add(rightElbow);

    const rightForearm = new THREE.Mesh(leftForearmGeo, forearmMat);
    rightForearm.position.y = -forearmLen * 0.5;
    rightForearm.castShadow = true;
    this.addOutline(rightForearm, 1.08);
    rightElbow.add(rightForearm);

    // Right Wrist Joint
    const rightWrist = new THREE.Group();
    rightWrist.position.set(0, -forearmLen, 0);
    rightElbow.add(rightWrist);

    // Right Hand Group
    const rightHand = new THREE.Group();
    rightWrist.add(rightHand);

    let rightGloveMesh: THREE.Mesh;
    if (gType === 'hand_wraps') {
      const wrapGeo = new THREE.CylinderGeometry(armThickness * 1.35, armThickness * 1.25, 0.32, 10);
      rightGloveMesh = new THREE.Mesh(wrapGeo, gloveMat);
      rightGloveMesh.position.set(0, -0.16, 0.04);
    } else if (gType === 'work_gloves') {
      const gloveGeo = new THREE.BoxGeometry(0.24, 0.28, 0.24);
      rightGloveMesh = new THREE.Mesh(gloveGeo, gloveMat);
      rightGloveMesh.position.set(0, -0.14, 0.04);
      const redCuffMat = this.createToonMat(app.cuffColor ?? 0xef4444);
      const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.26), redCuffMat);
      cuff.position.set(0, 0.05, 0.04);
      this.addOutline(cuff, 1.08);
      rightHand.add(cuff);
    } else if (gType === 'bare_hands' || isMoshon) {
      const fistGeo = new THREE.SphereGeometry(armThickness * 1.3, 10, 10);
      rightGloveMesh = new THREE.Mesh(fistGeo, skinMat);
      rightGloveMesh.position.set(0, -armThickness * 0.9, 0.02);
    } else {
      const rightGloveGeo = new THREE.SphereGeometry(gloveSize, 14, 14);
      rightGloveMesh = new THREE.Mesh(rightGloveGeo, gloveMat);
      rightGloveMesh.position.set(0, -gloveSize * 0.45, gloveSize * 0.3);
    }
    rightGloveMesh.castShadow = true;
    this.addOutline(rightGloveMesh, 1.07);
    rightHand.add(rightGloveMesh);

    // Handheld Props (Wrench & Power Drill) for attacks
    const wrenchProp = new THREE.Group();
    const steelMat = this.createToonMat(0x94a3b8);
    const wrenchShaft = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.05), steelMat);
    wrenchShaft.position.set(0, 0.15, 0);
    wrenchProp.add(wrenchShaft);
    const wrenchJaw = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.032, 6, 10, Math.PI * 1.6), steelMat);
    wrenchJaw.position.set(0, 0.42, 0);
    wrenchProp.add(wrenchJaw);
    this.addOutline(wrenchShaft, 1.08);
    wrenchProp.visible = false;
    rightHand.add(wrenchProp);

    const drillProp = new THREE.Group();
    const drillMat = this.createToonMat(0x0284c7);
    const drillBody = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.34), drillMat);
    drillBody.position.set(0, 0.04, 0.12);
    drillProp.add(drillBody);
    const drillBit = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 6), steelMat);
    drillBit.rotation.x = Math.PI / 2;
    drillBit.position.set(0, 0.06, 0.45);
    drillProp.add(drillBit);
    this.addOutline(drillBody, 1.08);
    drillProp.visible = false;
    rightHand.add(drillProp);

    // Pink Aura for Dandan when fully charged with Jasmine Power
    const pinkAuraMat = new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
    });
    const pinkAura = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), pinkAuraMat);
    pinkAura.position.set(0, 1.0, 0);
    pinkAura.visible = false;
    root.add(pinkAura);

    // Dandan's Level 2 Super: "SERVICE CALL!" Commercial Van Prop
    let serviceVanProp: THREE.Group | undefined;
    const serviceVanWheels: THREE.Mesh[] = [];
    const serviceVanHeadlights: THREE.Mesh[] = [];
    let excavatorProp: THREE.Group | undefined;
    let excavatorArm: THREE.Group | undefined;
    let excavatorBucket: THREE.Group | undefined;

    if (config.id === 'fighter_dandan') {
      serviceVanProp = new THREE.Group();
      const vanWhiteMat = this.createToonMat(0xf8fafc);
      const dustMat = this.createToonMat(0xd7c4b0); // Road dust on lower panels
      const blackPlasticMat = this.createToonMat(0x18181b); // Black plastic bumpers & side trim
      const tireMat = this.createToonMat(0x09090b); // Black rubber tires
      const steelRimMat = this.createToonMat(0xd4d4d8); // Steel wheels
      const glassMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 });
      const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a }); // Bright glowing headlights
      const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Red tail lights
      const silverMat = this.createToonMat(0xe4e4e7);
      const aluminumMat = this.createToonMat(0x94a3b8);
      const peachMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 }); // Peach emblem
      const leafMat = new THREE.MeshBasicMaterial({ color: 0x22c55e }); // Leaf on peach
      const redToolboxMat = this.createToonMat(0xb91c1c);

      // 1. Tall Boxy Van Body (Cargo compartment & rear)
      const bodyBox = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.96, 1.35), vanWhiteMat);
      bodyBox.position.set(0, 0.72, -0.15);
      this.addOutline(bodyBox, 1.05);
      serviceVanProp.add(bodyBox);

      // Lower dust/dirt on body (dust on the lower part)
      const dustStrip = new THREE.Mesh(new THREE.BoxGeometry(1.07, 0.18, 1.36), dustMat);
      dustStrip.position.set(0, 0.32, -0.15);
      serviceVanProp.add(dustStrip);

      // 2. Short Sloped Hood (Front cab)
      const hoodBox = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.46, 0.60), vanWhiteMat);
      hoodBox.position.set(0, 0.46, 0.68);
      this.addOutline(hoodBox, 1.05);
      serviceVanProp.add(hoodBox);

      const hoodDust = new THREE.Mesh(new THREE.BoxGeometry(1.03, 0.16, 0.61), dustMat);
      hoodDust.position.set(0, 0.31, 0.68);
      serviceVanProp.add(hoodDust);

      // Sloped front hood surface
      const hoodSlope = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.14, 0.42), vanWhiteMat);
      hoodSlope.position.set(0, 0.64, 0.60);
      hoodSlope.rotation.x = -0.32;
      serviceVanProp.add(hoodSlope);

      // 3. Big Windshield & Side Windows
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.44, 0.05), glassMat);
      windshield.position.set(0, 0.88, 0.46);
      windshield.rotation.x = -0.44;
      serviceVanProp.add(windshield);

      // Driver side window (Left) - open / rolled down so Dandan can lean out!
      const sideWindowL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.42), glassMat);
      sideWindowL.position.set(0.54, 0.80, 0.20);
      serviceVanProp.add(sideWindowL);

      // Passenger side window (Right)
      const sideWindowR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.42), glassMat);
      sideWindowR.position.set(-0.54, 0.88, 0.20);
      serviceVanProp.add(sideWindowR);

      // 4. Black Plastic Bumpers & Side Protective Strips
      // Front bumper
      const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.22, 0.16), blackPlasticMat);
      frontBumper.position.set(0, 0.28, 0.98);
      this.addOutline(frontBumper, 1.05);
      serviceVanProp.add(frontBumper);

      // Front black grille
      const grille = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.18, 0.06), blackPlasticMat);
      grille.position.set(0, 0.48, 0.98);
      serviceVanProp.add(grille);

      // Rear bumper
      const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.22, 0.16), blackPlasticMat);
      rearBumper.position.set(0, 0.28, -0.85);
      this.addOutline(rearBumper, 1.05);
      serviceVanProp.add(rearBumper);

      // Black side rub strips along lower sides
      const stripL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 1.80), blackPlasticMat);
      stripL.position.set(0.54, 0.46, 0.0);
      serviceVanProp.add(stripL);

      const stripR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.09, 1.80), blackPlasticMat);
      stripR.position.set(-0.54, 0.46, 0.0);
      serviceVanProp.add(stripR);

      // Black Side Mirrors
      const mirrorL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), blackPlasticMat);
      mirrorL.position.set(0.62, 0.88, 0.38);
      this.addOutline(mirrorL, 1.06);
      serviceVanProp.add(mirrorL);

      const mirrorR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), blackPlasticMat);
      mirrorR.position.set(-0.62, 0.88, 0.38);
      this.addOutline(mirrorR, 1.06);
      serviceVanProp.add(mirrorR);

      // 5. Front Badge: a small peach emblem (orange-pink peach with a green leaf) inside a silver oval
      const badgeGroup = new THREE.Group();
      badgeGroup.position.set(0, 0.48, 1.02);

      const badgeOval = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.02, 16), silverMat);
      badgeOval.scale.set(1.35, 1.0, 0.85);
      badgeOval.rotation.x = Math.PI / 2;
      badgeGroup.add(badgeOval);

      const peachEmblem = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 10), peachMat);
      peachEmblem.scale.set(1.0, 1.0, 0.5);
      peachEmblem.position.set(0, 0, 0.015);
      badgeGroup.add(peachEmblem);

      const leafEmblem = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.04, 6), leafMat);
      leafEmblem.rotation.z = -0.65;
      leafEmblem.position.set(0.025, 0.035, 0.016);
      badgeGroup.add(leafEmblem);

      serviceVanProp.add(badgeGroup);

      // 6. Headlights (Bright on) & Forward light beams
      const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.08), headlightMat);
      hlLeft.position.set(0.38, 0.48, 0.98);
      serviceVanProp.add(hlLeft);
      serviceVanHeadlights.push(hlLeft);

      const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.08), headlightMat);
      hlRight.position.set(-0.38, 0.48, 0.98);
      serviceVanProp.add(hlRight);
      serviceVanHeadlights.push(hlRight);

      // Forward light beam cones
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      });
      const beamL = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.2, 12), beamMat);
      beamL.rotation.x = Math.PI / 2;
      beamL.position.set(0.38, 0.46, 2.05);
      serviceVanProp.add(beamL);

      const beamR = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.2, 12), beamMat);
      beamR.rotation.x = Math.PI / 2;
      beamR.position.set(-0.38, 0.46, 2.05);
      serviceVanProp.add(beamR);

      // 7. Sliding Side Door with "MEREISI PROD." stencil text & small dent
      const doorCanvas = document.createElement('canvas');
      doorCanvas.width = 512;
      doorCanvas.height = 256;
      const dctx = doorCanvas.getContext('2d');
      if (dctx) {
        dctx.fillStyle = '#f8fafc';
        dctx.fillRect(0, 0, 512, 256);

        // Lower road dust
        const dustGrad = dctx.createLinearGradient(0, 180, 0, 256);
        dustGrad.addColorStop(0, 'rgba(215, 196, 176, 0)');
        dustGrad.addColorStop(1, 'rgba(215, 196, 176, 0.85)');
        dctx.fillStyle = dustGrad;
        dctx.fillRect(0, 180, 512, 76);

        // Sliding door outline seam
        dctx.strokeStyle = '#94a3b8';
        dctx.lineWidth = 4;
        dctx.strokeRect(40, 20, 430, 220);

        // Stencil text: "MEREISI PROD."
        dctx.font = '900 36px monospace';
        dctx.textAlign = 'center';
        dctx.fillStyle = '#1e293b';
        dctx.fillText('MEREISI PROD.', 256, 120);

        // Small service icon / subtext
        dctx.font = '700 18px sans-serif';
        dctx.fillStyle = '#64748b';
        dctx.fillText('TECHNICAL SERVICES', 256, 155);

        // Small work dent crease on door
        dctx.strokeStyle = '#64748b';
        dctx.lineWidth = 3;
        dctx.beginPath();
        dctx.arc(360, 180, 18, 0.2, 2.8);
        dctx.stroke();
        dctx.fillStyle = 'rgba(71, 85, 105, 0.35)';
        dctx.fill();
      }
      const doorTex = new THREE.CanvasTexture(doorCanvas);
      const doorPanelGeo = new THREE.PlaneGeometry(0.85, 0.55);

      // Left side sliding door decal (camera facing side)
      const doorPanelMatL = new THREE.MeshBasicMaterial({ map: doorTex, transparent: false });
      const sideDoorL = new THREE.Mesh(doorPanelGeo, doorPanelMatL);
      sideDoorL.rotation.y = Math.PI / 2;
      sideDoorL.position.set(0.54, 0.65, -0.15);
      serviceVanProp.add(sideDoorL);

      // Right side door decal
      const doorPanelMatR = new THREE.MeshBasicMaterial({ map: doorTex, transparent: false });
      const sideDoorR = new THREE.Mesh(doorPanelGeo, doorPanelMatR);
      sideDoorR.rotation.y = -Math.PI / 2;
      sideDoorR.position.set(-0.54, 0.65, -0.15);
      serviceVanProp.add(sideDoorR);

      // Physical 3D small dent on door
      const dentMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.08, 0.12), this.createToonMat(0xc4b5a4));
      dentMesh.position.set(0.54, 0.56, -0.32);
      serviceVanProp.add(dentMesh);

      // Sliding door handle
      const doorHandleL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.14), blackPlasticMat);
      doorHandleL.position.set(0.55, 0.68, 0.18);
      serviceVanProp.add(doorHandleL);

      // 8. Two Rear Barn Doors
      const rearDoorSeam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.85, 0.04), blackPlasticMat);
      rearDoorSeam.position.set(0, 0.72, -0.83);
      serviceVanProp.add(rearDoorSeam);

      const rearHandleL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.04), blackPlasticMat);
      rearHandleL.position.set(-0.06, 0.66, -0.83);
      serviceVanProp.add(rearHandleL);

      const rearHandleR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.04), blackPlasticMat);
      rearHandleR.position.set(0.06, 0.66, -0.83);
      serviceVanProp.add(rearHandleR);

      // Red tail lights
      const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.04), taillightMat);
      tailL.position.set(0.48, 0.72, -0.83);
      serviceVanProp.add(tailL);

      const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.04), taillightMat);
      tailR.position.set(-0.48, 0.72, -0.83);
      serviceVanProp.add(tailR);

      // 9. Steel Wheels with Black Rubber Tires
      const tireGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.14, 14);
      tireGeo.rotateZ(Math.PI / 2);
      const wheelPositions = [
        [0.48, 0.20, 0.54],
        [-0.48, 0.20, 0.54],
        [0.48, 0.20, -0.52],
        [-0.48, 0.20, -0.52],
      ];
      wheelPositions.forEach(([wx, wy, wz]) => {
        const wheel = new THREE.Mesh(tireGeo, tireMat);
        wheel.position.set(wx, wy, wz);

        // Steel rim with hub
        const steelRim = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.15, 12), steelRimMat);
        steelRim.rotation.z = Math.PI / 2;
        wheel.add(steelRim);

        // Dark hub center cap
        const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 8), blackPlasticMat);
        hubCap.rotation.z = Math.PI / 2;
        wheel.add(hubCap);

        this.addOutline(wheel, 1.06);
        serviceVanProp!.add(wheel);
        serviceVanWheels.push(wheel);
      });

      // 10. Tools & Ladder on Roof Rack
      const roofRackGroup = new THREE.Group();
      roofRackGroup.position.set(0, 1.20, -0.15);

      // Tubular rack rails
      const railGeo = new THREE.BoxGeometry(0.04, 0.04, 1.35);
      const railL = new THREE.Mesh(railGeo, blackPlasticMat);
      railL.position.set(0.42, 0.05, 0);
      roofRackGroup.add(railL);

      const railR = new THREE.Mesh(railGeo, blackPlasticMat);
      railR.position.set(-0.42, 0.05, 0);
      roofRackGroup.add(railR);

      // 3 Crossbars
      for (const cz of [-0.55, 0, 0.55]) {
        const cross = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.04, 0.04), blackPlasticMat);
        cross.position.set(0, 0.05, cz);
        roofRackGroup.add(cross);
      }

      // Aluminum Extension Ladder on left side of roof
      const ladderGroup = new THREE.Group();
      ladderGroup.position.set(0.20, 0.10, 0);

      const lBeamGeo = new THREE.BoxGeometry(0.03, 0.06, 1.45);
      const lBeamL = new THREE.Mesh(lBeamGeo, aluminumMat);
      lBeamL.position.set(0.14, 0, 0);
      ladderGroup.add(lBeamL);

      const lBeamR = new THREE.Mesh(lBeamGeo, aluminumMat);
      lBeamR.position.set(-0.14, 0, 0);
      ladderGroup.add(lBeamR);

      // 6 Rungs
      for (let r = -2; r <= 3; r++) {
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 8), silverMat);
        rung.rotation.z = Math.PI / 2;
        rung.position.set(0, 0, r * 0.23);
        ladderGroup.add(rung);
      }
      roofRackGroup.add(ladderGroup);

      // Red Toolbox strapped on right side of roof rack
      const toolBox = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.20, 0.50), redToolboxMat);
      toolBox.position.set(-0.22, 0.12, -0.15);
      this.addOutline(toolBox, 1.06);
      roofRackGroup.add(toolBox);

      // PVC Pipe Conduit tube carrier strapped alongside
      const conduitPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.35, 10), silverMat);
      conduitPipe.rotation.x = Math.PI / 2;
      conduitPipe.position.set(-0.36, 0.10, -0.05);
      roofRackGroup.add(conduitPipe);

      serviceVanProp.add(roofRackGroup);

      serviceVanProp.visible = false;
      bodyMesh.add(serviceVanProp);
      excavatorProp = serviceVanProp; // alias for safety
    }

    let carDoorProp: THREE.Group | undefined;
    let whiteCarProp: THREE.Group | undefined;
    let linoyRageAura: THREE.Mesh | undefined;
    let steamEarsGroup: THREE.Group | undefined;
    let electricWiresProp: THREE.Group | undefined;
    let overclockChipProp: THREE.Group | undefined;
    let circuitBoardOverlay: THREE.Group | undefined;
    let phone3DProp: THREE.Group | undefined;
    let phonePopupMesh: THREE.Mesh | undefined;
    let phoneCallTexture: THREE.CanvasTexture | undefined;
    let phoneWhereTexture: THREE.CanvasTexture | undefined;
    let phoneMissedTexture: THREE.CanvasTexture | undefined;

    if (isMoshon) {
      // 1. Car Door Prop (White car door slammed into opponent)
      carDoorProp = new THREE.Group();
      const whiteCarMat = this.createToonMat(0xf8fafc);
      const windowGlassMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 });
      const handleMat = this.createToonMat(0x64748b);
      const interiorMat = this.createToonMat(0x1e293b);

      // Door outer shell
      const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.08), whiteCarMat);
      doorMesh.position.set(0, 0, 0);
      this.addOutline(doorMesh, 1.06);
      carDoorProp.add(doorMesh);

      // Door window
      const doorWindow = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.42, 0.06), windowGlassMat);
      doorWindow.position.set(0.04, 0.22, 0.02);
      carDoorProp.add(doorWindow);

      // Door handle
      const doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.06), handleMat);
      doorHandle.position.set(-0.25, -0.06, 0.06);
      carDoorProp.add(doorHandle);

      // Black rubber trim
      const doorTrim = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.04, 0.10), interiorMat);
      doorTrim.position.set(0, -0.42, 0);
      carDoorProp.add(doorTrim);

      carDoorProp.position.set(0.7, 0.7, 0.35);
      carDoorProp.visible = false;
      bodyMesh.add(carDoorProp);

      // 2. White Car Prop (Holon Parking Level 2 Super)
      whiteCarProp = new THREE.Group();
      const carBodyMat = this.createToonMat(0xf8fafc);
      const tireMat = this.createToonMat(0x0f172a);
      const rimMat = this.createToonMat(0xe2e8f0);
      const headLightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const grillMat = this.createToonMat(0x1e293b);

      // Car Main Body
      const carCab = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.65, 0.95), carBodyMat);
      carCab.position.set(0, 0.45, 0);
      this.addOutline(carCab, 1.05);
      whiteCarProp.add(carCab);

      // Roof / Greenhouse
      const carRoof = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 0.85), windowGlassMat);
      carRoof.position.set(-0.1, 0.85, 0);
      whiteCarProp.add(carRoof);

      // Front Grill
      const grill = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.65), grillMat);
      grill.position.set(0.83, 0.38, 0);
      whiteCarProp.add(grill);

      // Headlights
      const hlLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), headLightMat);
      hlLeft.rotation.z = Math.PI / 2;
      hlLeft.position.set(0.83, 0.42, 0.32);
      whiteCarProp.add(hlLeft);

      const hlRight = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12), headLightMat);
      hlRight.rotation.z = Math.PI / 2;
      hlRight.position.set(0.83, 0.42, -0.32);
      whiteCarProp.add(hlRight);

      // 4 Wheels
      const wheelGeo = new THREE.CylinderGeometry(0.20, 0.20, 0.14, 14);
      wheelGeo.rotateX(Math.PI / 2);
      const wheelPositions = [
        [0.55, 0.20, 0.52],
        [0.55, 0.20, -0.52],
        [-0.55, 0.20, 0.52],
        [-0.55, 0.20, -0.52],
      ];
      wheelPositions.forEach(([wx, wy, wz]) => {
        const wheel = new THREE.Mesh(wheelGeo, tireMat);
        wheel.position.set(wx, wy, wz);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.15, 10), rimMat);
        rim.rotation.x = Math.PI / 2;
        wheel.add(rim);
        this.addOutline(wheel, 1.06);
        whiteCarProp!.add(wheel);
      });

      whiteCarProp.visible = false;
      bodyMesh.add(whiteCarProp);

      // 3. Steam from Pointy Ears (Linoy's Rage)
      steamEarsGroup = new THREE.Group();
      const steamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
      for (let side = -1; side <= 1; side += 2) {
        for (let s = 0; s < 4; s++) {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(0.06 + s * 0.03, 8, 8), steamMat);
          puff.position.set(side * (headRadius * 0.95 + s * 0.08), headRadius * 0.8 + s * 0.09, 0);
          steamEarsGroup.add(puff);
        }
      }
      steamEarsGroup.visible = false;
      head.add(steamEarsGroup);

      // 4. Linoy's Rage Fiery Red Aura
      const auraGeo = new THREE.SphereGeometry(1.2, 16, 16);
      auraGeo.scale(0.85, 1.35, 0.85);
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.45,
        wireframe: true,
      });
      linoyRageAura = new THREE.Mesh(auraGeo, auraMat);
      linoyRageAura.position.set(0, 0.9, 0);
      linoyRageAura.visible = false;
      bodyMesh.add(linoyRageAura);

      // 5. Electric Wires Prop (Level 1: SHORT CIRCUIT - electrician)
      // Two live wires pulled from belt with brass clamps and sparking electric tips
      const electricWiresProp = new THREE.Group();
      const redWireMat = this.createToonMat(0xef4444);
      const blueWireMat = this.createToonMat(0x3b82f6);
      const copperMat = this.createToonMat(0xf59e0b);
      const sparkTipMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

      // Red wire (right side)
      const redWire = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 8), redWireMat);
      redWire.position.set(0.28, 0.35, 0.45);
      redWire.rotation.x = Math.PI / 2.2;
      const redTip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.025, 0.18, 6), copperMat);
      redTip.position.set(0, 0.46, 0);
      const redSpark = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), sparkTipMat);
      redSpark.position.set(0, 0.56, 0);
      redWire.add(redTip);
      redWire.add(redSpark);
      electricWiresProp.add(redWire);

      // Blue wire (left side)
      const blueWire = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 8), blueWireMat);
      blueWire.position.set(-0.28, 0.35, 0.45);
      blueWire.rotation.x = Math.PI / 2.2;
      const blueTip = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.025, 0.18, 6), copperMat);
      blueTip.position.set(0, 0.46, 0);
      const blueSpark = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), sparkTipMat);
      blueSpark.position.set(0, 0.56, 0);
      blueWire.add(blueTip);
      blueWire.add(blueSpark);
      electricWiresProp.add(blueWire);

      electricWiresProp.visible = false;
      bodyMesh.add(electricWiresProp);

      // 6. Glowing Computer Chip Prop (Level 2: OVERCLOCKED - hi-tech worker)
      const overclockChipProp = new THREE.Group();
      const chipMat = this.createToonMat(0x0f172a);
      const pinMat = this.createToonMat(0xfacc15);
      const chipCoreMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const chipBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.05), chipMat);
      const chipCore = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.06), chipCoreMat);
      chipBody.add(chipCore);
      for (let p = -2; p <= 2; p++) {
        const leftPin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.02), pinMat);
        leftPin.position.set(-0.14, p * 0.045, 0);
        chipBody.add(leftPin);
        const rightPin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.02), pinMat);
        rightPin.position.set(0.14, p * 0.045, 0);
        chipBody.add(rightPin);
      }
      this.addOutline(chipBody, 1.08);
      overclockChipProp.add(chipBody);
      overclockChipProp.position.set(0, 0.48, 0.26);
      overclockChipProp.visible = false;
      spine.add(overclockChipProp);

      // 7. Circuit Board Overlay on Jacket (OVERCLOCKED)
      const circuitBoardOverlay = new THREE.Group();
      const circuitMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const trace1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.52, 0.02), circuitMat);
      trace1.position.set(0.18, 0.38, 0.24);
      const trace2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.52, 0.02), circuitMat);
      trace2.position.set(-0.18, 0.38, 0.24);
      const traceH = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.02), circuitMat);
      traceH.position.set(0, 0.25, 0.24);
      const node1 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), circuitMat);
      node1.position.set(0.18, 0.62, 0.24);
      const node2 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), circuitMat);
      node2.position.set(-0.18, 0.62, 0.24);
      circuitBoardOverlay.add(trace1, trace2, traceH, node1, node2);
      circuitBoardOverlay.visible = false;
      spine.add(circuitBoardOverlay);

      // 8. 3D Phone Prop & Pop-up Screens (Level 3 & Poses)
      const phone3DProp = new THREE.Group();
      const phoneBody = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, 0.03), this.createToonMat(0x09090b));
      const phoneRim = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.29, 0.02), this.createToonMat(0x94a3b8));
      phone3DProp.add(phoneRim);
      phone3DProp.add(phoneBody);
      phone3DProp.position.set(0, -0.06, 0.12);
      phone3DProp.visible = false;
      rightHand.add(phone3DProp);

      const phoneCallTexture = this.createTextCanvasTexture(['📞 LINOY CALLING...', 'WHERE ARE YOU?!'], '#1e293b', '#ef4444', '#ef4444');
      const phoneWhereTexture = this.createTextCanvasTexture(['💬 LINOY:', 'WHERE ARE YOU?!'], '#7f1d1d', '#ffffff', '#f87171');
      const phoneMissedTexture = this.createTextCanvasTexture(['1 MISSED CALL', 'LINOY (WIFE)'], '#0f172a', '#facc15', '#eab308');

      const phonePopupGeo = new THREE.PlaneGeometry(1.6, 0.8);
      const phonePopupMat = new THREE.MeshBasicMaterial({ map: phoneCallTexture, transparent: true, side: THREE.DoubleSide });
      const phonePopupMesh = new THREE.Mesh(phonePopupGeo, phonePopupMat);
      phonePopupMesh.position.set(0, 2.3, 0.2);
      phonePopupMesh.visible = false;
      root.add(phonePopupMesh);
    }

    // Generic Status Effects for All Fighters:
    // 1. FATAL ERROR screen (frozen in blue error screen)
    const fatalErrorScreen = new THREE.Group();
    const errTex = this.createTextCanvasTexture(
      [':( FATAL ERROR', 'SYSTEM OVERHEATED', 'FREEZE (1.5s)'],
      '#0284c7',
      '#ffffff',
      '#38bdf8'
    );
    const errGeo = new THREE.PlaneGeometry(1.8, 0.95);
    const errMat = new THREE.MeshBasicMaterial({ map: errTex, transparent: true, side: THREE.DoubleSide });
    const errMesh = new THREE.Mesh(errGeo, errMat);
    errMesh.position.set(0, 1.7, 0.5);
    fatalErrorScreen.add(errMesh);
    fatalErrorScreen.visible = false;
    root.add(fatalErrorScreen);

    // 2. Cartoon X-Ray Skeleton (flashing 3 times on Short Circuit electric shock)
    const xraySkeletonMesh = new THREE.Group();
    const boneMat = new THREE.MeshBasicMaterial({ color: 0xecfeff, transparent: true, opacity: 0.95 });
    const spineBone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8), boneMat);
    spineBone.position.set(0, 0.6, 0.06);
    xraySkeletonMesh.add(spineBone);
    for (let r = 0; r < 4; r++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.25 + r * 0.03, 0.025, 6, 12, Math.PI * 1.2), boneMat);
      rib.rotation.x = Math.PI / 2;
      rib.rotation.z = -Math.PI * 0.6;
      rib.position.set(0, 0.45 + r * 0.12, 0.06);
      xraySkeletonMesh.add(rib);
    }
    const skullBone = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), boneMat);
    skullBone.position.set(0, 1.48, 0.06);
    skullBone.scale.set(0.9, 1.0, 0.85);
    xraySkeletonMesh.add(skullBone);
    xraySkeletonMesh.visible = false;
    bodyMesh.add(xraySkeletonMesh);

    // 3. Ear Smoke Puffs (smoke coming out of ears when shocked)
    const earSmokeGroup = new THREE.Group();
    const smokePuffMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.85 });
    for (let side = -1; side <= 1; side += 2) {
      for (let s = 0; s < 3; s++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.06 + s * 0.03, 8, 8), smokePuffMat);
        puff.position.set(side * (headRadius * 0.95 + s * 0.07), headRadius * 0.8 + s * 0.1, 0);
        earSmokeGroup.add(puff);
      }
    }
    earSmokeGroup.visible = false;
    head.add(earSmokeGroup);

    // 9. Left Leg Hierarchy (Hip socket -> Thigh -> Knee -> Calf -> Ankle -> Foot)
    const isShorts = app.pantsType === 'shorts' || !app.pantsType;
    const thighMat = primaryMat;
    const calfMat = isShorts ? skinMat : primaryMat;

    const leftHip = new THREE.Group();
    leftHip.position.set(pelvisW * 0.28, -pelvisH * 0.4, 0);
    hips.add(leftHip);

    const leftThighGeo = new THREE.CylinderGeometry(legThickness * 1.15, legThickness, thighLen, 10);
    const leftThigh = new THREE.Mesh(leftThighGeo, thighMat);
    leftThigh.position.y = -thighLen * 0.5;
    leftThigh.castShadow = true;
    this.addOutline(leftThigh, 1.08);
    leftHip.add(leftThigh);

    // Left Knee Joint
    const leftKnee = new THREE.Group();
    leftKnee.position.set(0, -thighLen, 0);
    leftHip.add(leftKnee);

    if (isMoshon) {
      // Horizontal distressed rip on left knee
      const ripMat = this.createToonMat(0x3f3f46);
      const skinRipMat = this.createToonMat(0xcfa588);
      const ripMesh = new THREE.Mesh(new THREE.BoxGeometry(legThickness * 1.08, 0.045, 0.04), ripMat);
      ripMesh.position.set(0, -0.02, legThickness * 0.52);
      const skinThread = new THREE.Mesh(new THREE.BoxGeometry(legThickness * 0.72, 0.02, 0.045), skinRipMat);
      skinThread.position.set(0, -0.02, legThickness * 0.525);
      leftKnee.add(ripMesh);
      leftKnee.add(skinThread);
    }

    const leftCalfGeo = new THREE.CylinderGeometry(legThickness, legThickness * 1.05, calfLen, 10);
    const leftCalf = new THREE.Mesh(leftCalfGeo, calfMat);
    leftCalf.position.y = -calfLen * 0.5;
    leftCalf.castShadow = true;
    this.addOutline(leftCalf, 1.08);
    leftKnee.add(leftCalf);

    // Left Ankle Joint
    const leftAnkle = new THREE.Group();
    leftAnkle.position.set(0, -calfLen, 0);
    leftKnee.add(leftAnkle);

    // Left Foot Group
    const leftFoot = new THREE.Group();
    leftAnkle.add(leftFoot);

    const sType = app.shoesType || 'boxing_boots';
    let leftBootMesh: THREE.Mesh;
    if (sType === 'barefoot') {
      const footGeo = new THREE.BoxGeometry(0.2, 0.12, 0.38);
      leftBootMesh = new THREE.Mesh(footGeo, skinMat);
      leftBootMesh.position.set(0, -0.06, 0.1);
    } else if (sType === 'sneakers') {
      const sneakerGeo = new THREE.BoxGeometry(0.23, 0.15, 0.44);
      leftBootMesh = new THREE.Mesh(sneakerGeo, shoesMat);
      leftBootMesh.position.set(0, -0.08, 0.1);
    } else if (sType === 'martial_wraps') {
      const wrapGeo = new THREE.BoxGeometry(0.21, 0.14, 0.4);
      leftBootMesh = new THREE.Mesh(wrapGeo, shoesMat);
      leftBootMesh.position.set(0, -0.07, 0.08);
    } else {
      // Boxing boots (high lace boot)
      const bootGeo = new THREE.BoxGeometry(0.24, 0.22, 0.44);
      leftBootMesh = new THREE.Mesh(bootGeo, shoesMat);
      leftBootMesh.position.set(0, -0.1, 0.1);
    }
    leftBootMesh.castShadow = true;
    this.addOutline(leftBootMesh, 1.08);
    leftFoot.add(leftBootMesh);

    // 10. Right Leg Hierarchy (Hip socket -> Thigh -> Knee -> Calf -> Ankle -> Foot)
    const rightHip = new THREE.Group();
    rightHip.position.set(-pelvisW * 0.28, -pelvisH * 0.4, 0);
    hips.add(rightHip);

    const rightThigh = new THREE.Mesh(leftThighGeo, thighMat);
    rightThigh.position.y = -thighLen * 0.5;
    rightThigh.castShadow = true;
    this.addOutline(rightThigh, 1.08);
    rightHip.add(rightThigh);

    // Right Knee Joint
    const rightKnee = new THREE.Group();
    rightKnee.position.set(0, -thighLen, 0);
    rightHip.add(rightKnee);

    if (isMoshon) {
      // Horizontal distressed rip on right knee
      const ripMat = this.createToonMat(0x3f3f46);
      const skinRipMat = this.createToonMat(0xcfa588);
      const ripMesh = new THREE.Mesh(new THREE.BoxGeometry(legThickness * 1.08, 0.045, 0.04), ripMat);
      ripMesh.position.set(0, -0.02, legThickness * 0.52);
      const skinThread = new THREE.Mesh(new THREE.BoxGeometry(legThickness * 0.72, 0.02, 0.045), skinRipMat);
      skinThread.position.set(0, -0.02, legThickness * 0.525);
      rightKnee.add(ripMesh);
      rightKnee.add(skinThread);
    }

    const rightCalf = new THREE.Mesh(leftCalfGeo, calfMat);
    rightCalf.position.y = -calfLen * 0.5;
    rightCalf.castShadow = true;
    this.addOutline(rightCalf, 1.08);
    rightKnee.add(rightCalf);

    // Right Ankle Joint
    const rightAnkle = new THREE.Group();
    rightAnkle.position.set(0, -calfLen, 0);
    rightKnee.add(rightAnkle);

    // Right Foot Group
    const rightFoot = new THREE.Group();
    rightAnkle.add(rightFoot);

    let rightBootMesh: THREE.Mesh;
    if (sType === 'barefoot') {
      const footGeo = new THREE.BoxGeometry(0.2, 0.12, 0.38);
      rightBootMesh = new THREE.Mesh(footGeo, skinMat);
      rightBootMesh.position.set(0, -0.06, 0.1);
    } else if (sType === 'sneakers') {
      const sneakerGeo = new THREE.BoxGeometry(0.23, 0.15, 0.44);
      rightBootMesh = new THREE.Mesh(sneakerGeo, shoesMat);
      rightBootMesh.position.set(0, -0.08, 0.1);
    } else if (sType === 'martial_wraps') {
      const wrapGeo = new THREE.BoxGeometry(0.21, 0.14, 0.4);
      rightBootMesh = new THREE.Mesh(wrapGeo, shoesMat);
      rightBootMesh.position.set(0, -0.07, 0.08);
    } else {
      const bootGeo = new THREE.BoxGeometry(0.24, 0.22, 0.44);
      rightBootMesh = new THREE.Mesh(bootGeo, shoesMat);
      rightBootMesh.position.set(0, -0.1, 0.1);
    }
    rightBootMesh.castShadow = true;
    this.addOutline(rightBootMesh, 1.08);
    rightFoot.add(rightBootMesh);

    return {
      root,
      bodyMesh,
      hips,
      spine,
      neck,
      head,
      faceGroup,
      leftEye,
      rightEye,
      leftPupil,
      rightPupil,
      jaw,
      mouthMesh,
      noseMesh,
      leftEyebrow,
      rightEyebrow,
      leftShoulder,
      leftElbow,
      leftWrist,
      leftHand,
      leftGloveMesh,
      rightShoulder,
      rightElbow,
      rightWrist,
      rightHand,
      rightGloveMesh,
      leftHip,
      leftKnee,
      leftAnkle,
      leftFoot,
      leftBootMesh,
      rightHip,
      rightKnee,
      rightAnkle,
      rightFoot,
      rightBootMesh,
      toolBeltMesh,
      wrenchProp,
      drillProp,
      serviceVanProp,
      serviceVanWheels,
      serviceVanHeadlights,
      excavatorProp,
      excavatorArm,
      excavatorBucket,
      pinkAura,
      carDoorProp,
      whiteCarProp,
      chainMesh,
      pendantMesh,
      linoyRageAura,
      steamEarsGroup,
      electricWiresProp,
      overclockChipProp,
      circuitBoardOverlay,
      glassesGlowMesh,
      phone3DProp,
      phonePopupMesh,
      phoneCallTexture,
      phoneWhereTexture,
      phoneMissedTexture,
      fatalErrorScreen,
      xraySkeletonMesh,
      earSmokeGroup,
      hairGroup,
      skinMaterials,
      bruiseMesh,
      blackEyeMesh,
      bleedingNoseMesh,
      eyebrowCutMesh,
      faceDamageDecal,
      faceDamageCanvas,
      faceDamageCtx,
      faceDamageTexture,
      dazedStarsGroup,
      tearStreamsGroup,
    };
  }

  /**
   * Updates progressive face damage: 60% bruise, 40% black eye, 20% bleeding nose & cut on eyebrow
   * Redraws face canvas texture and toggles 3D cartoon damage meshes
   */
  private updateFaceDamage(rig: CharacterRig, healthPct: number) {
    let newLevel = 0;
    if (healthPct <= 0.20) newLevel = 3; // 20%: bleeding nose, cut on eyebrow, black eye, bruise
    else if (healthPct <= 0.40) newLevel = 2; // 40%: black eye, bruise
    else if (healthPct <= 0.60) newLevel = 1; // 60%: bruise

    // 3D Cartoon meshes visibility
    if (rig.bruiseMesh) rig.bruiseMesh.visible = newLevel >= 1;
    if (rig.blackEyeMesh) rig.blackEyeMesh.visible = newLevel >= 2;
    if (rig.bleedingNoseMesh) rig.bleedingNoseMesh.visible = newLevel >= 3;
    if (rig.eyebrowCutMesh) rig.eyebrowCutMesh.visible = newLevel >= 3;

    // Redraw face damage texture canvas when level changes
    if (rig.faceDamageLevel !== newLevel && rig.faceDamageCtx && rig.faceDamageCanvas && rig.faceDamageTexture) {
      rig.faceDamageLevel = newLevel;
      drawFaceDamageCanvas(rig.faceDamageCtx, rig.faceDamageCanvas.width, rig.faceDamageCanvas.height, newLevel);
      rig.faceDamageTexture.needsUpdate = true;
    }
  }

  /**
   * Procedural skeletal animation driven by joint rotations:
   * Idle bouncing fight stance, walk cycle, punch/kick attacks, hit reactions, and KO tumble.
   */
  private animateCharacter(rig: CharacterRig, f: FighterState, state?: GameState) {
    // 1. Position & Horizontal Facing
    rig.root.position.set(f.x, f.y, 0);

    // Pancake flattening when run over by Dandan's service van (SERVICE CALL!) or squashed by armored door / belly-flop
    if (f.pancakeTicks && f.pancakeTicks > 0) {
      const pRatio = Math.min(1, f.pancakeTicks / 22);
      // Opponent gets flattened like a cartoon pancake for a moment, then pops back up!
      rig.root.scale.set(1 + pRatio * 0.45, Math.max(0.18, 1 - pRatio * 0.82), 1 + pRatio * 0.45);
      rig.hips.position.y = 0.18 + (1 - pRatio) * 0.67;
    } else if (state && state.matthewSleepSuper && state.matthewSleepSuper.attackerIndex === f.playerIndex) {
      const s = state.matthewSleepSuper.matthewScale || 1.0;
      rig.root.scale.set(s, s, s);
    } else {
      rig.root.scale.set(1, 1, 1);
    }

    const targetYRot = f.facing === 1 ? Math.PI / 2 : -Math.PI / 2;
    rig.bodyMesh.rotation.y = targetYRot;

    // Reset default joint transforms
    rig.bodyMesh.rotation.x = 0;
    rig.bodyMesh.rotation.z = 0;
    rig.hips.position.set(0, 0.85, 0);
    rig.spine.rotation.set(0, 0, 0);
    rig.neck.rotation.set(0, 0, 0);
    rig.head.rotation.set(0, 0, 0);

    // Moshon's gold pendant orientation: angle medallion toward side-view camera so "Jasmin" is clearly visible
    if (rig.pendantMesh) {
      const camAngle = f.facing === 1 ? -0.72 : 0.72;
      rig.pendantMesh.rotation.y = camAngle;
      rig.pendantMesh.rotation.x = 0.10;
    }

    // Face squash: head squashes briefly toward hit direction on heavy hits
    if (f.headSquashTimer && f.headSquashTimer > 0) {
      const squashFactor = f.headSquashTimer / 16;
      const dir = f.headSquashDirection ?? -f.facing;
      rig.head.scale.set(1 - squashFactor * 0.35, 1 + squashFactor * 0.35, 1 + squashFactor * 0.2);
      rig.head.rotation.z += dir * squashFactor * 0.25;
    } else {
      rig.head.scale.set(1, 1, 1);
    }

    // Wet skin shine (below 50% health: higher specular/emissive wet sheen)
    const isLowHealth = f.health <= f.maxHealth * 0.50;
    if (rig.skinMaterials) {
      for (const mat of rig.skinMaterials) {
        if (isLowHealth) {
          mat.emissive.setHex(0x28231d);
        } else {
          mat.emissive.setHex(0x000000);
        }
      }
    }

    // Dazed: circling stars over the head after a knockdown
    const isDazed = (f.dazedTicks && f.dazedTicks > 0) || f.actionState === 'KNOCKDOWN' || (f.wakeupTicks && f.wakeupTicks > 0);
    if (rig.dazedStarsGroup) {
      rig.dazedStarsGroup.visible = !!isDazed;
      if (isDazed) {
        rig.dazedStarsGroup.rotation.y += 0.14;
      }
    }

    // Cartoon tear streams from the eyes below 20% health
    const showTearStreams = f.health <= f.maxHealth * 0.20 && !f.isKo;
    if (rig.tearStreamsGroup) {
      rig.tearStreamsGroup.visible = showTearStreams;
    }

    // Progressive Face Damage (60% bruise, 40% black eye, 20% bleeding nose & cut)
    this.updateFaceDamage(rig, f.health / f.maxHealth);

    rig.leftShoulder.rotation.set(0, 0, 0);
    rig.leftElbow.rotation.set(0, 0, 0);
    rig.leftWrist.rotation.set(0, 0, 0);
    rig.leftHand.rotation.set(0, 0, 0);
    rig.leftGloveMesh.scale.set(1, 1, 1);

    rig.rightShoulder.rotation.set(0, 0, 0);
    rig.rightElbow.rotation.set(0, 0, 0);
    rig.rightWrist.rotation.set(0, 0, 0);
    rig.rightHand.rotation.set(0, 0, 0);
    rig.rightGloveMesh.scale.set(1, 1, 1);

    rig.leftHip.rotation.set(0, 0, 0);
    rig.leftKnee.rotation.set(0, 0, 0);
    rig.leftAnkle.rotation.set(0, 0, 0);
    rig.leftFoot.rotation.set(0, 0, 0);
    rig.leftBootMesh.scale.set(1, 1, 1);

    rig.rightHip.rotation.set(0, 0, 0);
    rig.rightKnee.rotation.set(0, 0, 0);
    rig.rightAnkle.rotation.set(0, 0, 0);
    rig.rightFoot.rotation.set(0, 0, 0);
    rig.rightBootMesh.scale.set(1, 1, 1);

    // Hit reactions must never scale any body part: keep eyes at default scale and position
    rig.leftEye.scale.set(1, 1, 1);
    rig.rightEye.scale.set(1, 1, 1);
    rig.jaw.position.y = 0.08;

    // Exaggerated wobble angle on impact
    if (f.wobbleAngle !== 0) {
      rig.bodyMesh.rotation.z = f.wobbleAngle;
      rig.spine.rotation.z = f.wobbleAngle * 0.6;
    }

    // Pink Aura for Dandan when fully charged with 3 levels of Super Meter (Jasmine Power)
    if (rig.pinkAura) {
      if (f.superMeter >= 300) {
        rig.pinkAura.visible = true;
        const pulse = 1.0 + Math.sin(performance.now() * 0.008) * 0.14;
        rig.pinkAura.scale.set(pulse, pulse, pulse);
        (rig.pinkAura.material as THREE.MeshBasicMaterial).opacity =
          0.3 + Math.sin(performance.now() * 0.008) * 0.15;
      } else {
        rig.pinkAura.visible = false;
      }
    }

    // Reset tool belt rotation and props if not attacking
    if (rig.electricWiresProp) rig.electricWiresProp.visible = false;
    if (rig.overclockChipProp) rig.overclockChipProp.visible = (f.overclockedTicks ?? 0) > 0;
    if (rig.circuitBoardOverlay) rig.circuitBoardOverlay.visible = (f.overclockedTicks ?? 0) > 0;
    if (rig.glassesGlowMesh) rig.glassesGlowMesh.visible = (f.overclockedTicks ?? 0) > 0;
    if (rig.phone3DProp) rig.phone3DProp.visible = false;
    if (rig.phonePopupMesh) rig.phonePopupMesh.visible = false;
    if (rig.fatalErrorScreen) rig.fatalErrorScreen.visible = (f.fatalErrorTicks ?? 0) > 0;
    if (rig.xraySkeletonMesh) {
      rig.xraySkeletonMesh.visible = (f.shockedTicks ?? 0) > 0 && Math.floor((f.shockedTicks ?? 0) / 6) % 2 === 0;
    }
    if (rig.earSmokeGroup) rig.earSmokeGroup.visible = (f.shockedTicks ?? 0) > 0;
    if (rig.hairGroup) {
      if ((f.shockedTicks ?? 0) > 0) {
        rig.hairGroup.scale.set(1.1, 1.85, 1.1); // Hair stands straight up on electrocution!
      } else {
        rig.hairGroup.scale.set(1, 1, 1);
      }
    }

    if (f.actionState !== 'ATTACKING') {
      if (rig.wrenchProp) rig.wrenchProp.visible = false;
      if (rig.drillProp) rig.drillProp.visible = false;
      if (rig.excavatorProp) rig.excavatorProp.visible = false;
      if (rig.serviceVanProp) rig.serviceVanProp.visible = false;
      if (rig.toolBeltMesh) rig.toolBeltMesh.rotation.y = 0;
      if (rig.noseMesh) {
        rig.noseMesh.scale.set(1, 1, 1);
        const isDandan = f.config.id === 'fighter_dandan';
        if (isDandan) {
          rig.noseMesh.position.set(0, 0.22, 0.376);
        } else {
          const eyeY = 0.40 * 0.78;
          const eyeZ = 0.40 * 0.82;
          rig.noseMesh.position.set(0, eyeY - 0.15, eyeZ + 0.08);
        }
      }
    }

    // Electrocution Quiver / Shiver
    if ((f.shockedTicks ?? 0) > 0) {
      rig.bodyMesh.rotation.z += Math.sin((f.shockedTicks ?? 0) * 3.5) * 0.14;
    }

    // "It Wasn't Me!" Counter Stance: Dandan fakes KO lying on canvas floor
    if (f.counterStanceTicks && f.counterStanceTicks > 0) {
      rig.bodyMesh.rotation.x = Math.PI / 2.15;
      rig.hips.position.y = 0.16;
      rig.leftKnee.rotation.x = 0.6;
      rig.rightKnee.rotation.x = 0.5;
      rig.leftShoulder.rotation.x = 1.4;
      rig.rightShoulder.rotation.x = 1.4;
      rig.head.rotation.y = 0.35;
      return;
    }

    const t = performance.now() * 0.007;

    // 2. Procedural Animation States
    switch (f.actionState) {
      case 'IDLE': {
        // Bouncing Fight Stance: rhythmic knee flex, hip bounce, guard breathing, head bob
        const bounce = Math.sin(t * 3.8) * 0.06;
        rig.hips.position.y = 0.85 + bounce;

        // Knees flex with bounce
        rig.leftHip.rotation.x = -0.22 - bounce * 1.2;
        rig.leftKnee.rotation.x = 0.45 + bounce * 2.2;
        rig.rightHip.rotation.x = -0.15 - bounce * 1.0;
        rig.rightKnee.rotation.x = 0.35 + bounce * 1.8;

        // Spine breathing & guard sway
        rig.spine.rotation.x = 0.08 + Math.sin(t * 1.9) * 0.04;
        rig.spine.rotation.y = Math.sin(t * 1.9) * 0.14;
        rig.neck.rotation.y = -Math.sin(t * 1.9) * 0.14; // eyes lock on opponent

        // Guard poses (Fists held up in boxing stance)
        rig.leftShoulder.rotation.x = -1.25 + Math.sin(t * 3.8) * 0.08;
        rig.leftShoulder.rotation.z = 0.25;
        rig.leftElbow.rotation.x = -1.55 + Math.sin(t * 3.8) * 0.1;

        rig.rightShoulder.rotation.x = -1.0 - Math.sin(t * 3.8) * 0.08;
        rig.rightShoulder.rotation.z = -0.25;
        rig.rightElbow.rotation.x = -1.45 - Math.sin(t * 3.8) * 0.1;
        break;
      }

      case 'WALK_FORWARD': {
        // Natural 2-beat biped walk cycle with arm/leg opposition
        const cycle = t * 6.5;
        rig.hips.position.y = 0.85 + Math.abs(Math.sin(cycle)) * 0.08;
        rig.spine.rotation.x = 0.18; // Aggressive forward stride lean

        // Left leg steps
        rig.leftHip.rotation.x = Math.sin(cycle) * 0.65;
        rig.leftKnee.rotation.x = Math.max(0, -Math.sin(cycle) * 0.7);
        rig.leftAnkle.rotation.x = -Math.sin(cycle) * 0.35;
        rig.leftFoot.rotation.x = -Math.sin(cycle) * 0.25;

        // Right leg steps
        rig.rightHip.rotation.x = -Math.sin(cycle) * 0.65;
        rig.rightKnee.rotation.x = Math.max(0, Math.sin(cycle) * 0.7);
        rig.rightAnkle.rotation.x = Math.sin(cycle) * 0.35;
        rig.rightFoot.rotation.x = Math.sin(cycle) * 0.25;

        // Arms swing in opposition to legs
        rig.leftShoulder.rotation.x = -0.9 + Math.cos(cycle) * 0.55;
        rig.leftElbow.rotation.x = -1.35 + Math.sin(cycle) * 0.3;
        rig.leftWrist.rotation.x = Math.sin(cycle) * 0.2;

        rig.rightShoulder.rotation.x = -0.9 - Math.cos(cycle) * 0.55;
        rig.rightElbow.rotation.x = -1.35 - Math.sin(cycle) * 0.3;
        rig.rightWrist.rotation.x = -Math.sin(cycle) * 0.2;
        break;
      }

      case 'WALK_BACK': {
        // Cautious backward step with tight guard
        const cycle = t * 5.5;
        rig.hips.position.y = 0.85 + Math.abs(Math.sin(cycle)) * 0.06;
        rig.spine.rotation.x = -0.12; // Cautious backward lean

        rig.leftHip.rotation.x = -Math.sin(cycle) * 0.5;
        rig.leftKnee.rotation.x = Math.max(0, Math.sin(cycle) * 0.55);
        rig.leftAnkle.rotation.x = Math.sin(cycle) * 0.25;

        rig.rightHip.rotation.x = Math.sin(cycle) * 0.5;
        rig.rightKnee.rotation.x = Math.max(0, -Math.sin(cycle) * 0.55);
        rig.rightAnkle.rotation.x = -Math.sin(cycle) * 0.25;

        // Shell guard held tight
        rig.leftShoulder.rotation.x = -1.4;
        rig.leftElbow.rotation.x = -1.8;
        rig.leftWrist.rotation.x = -0.2;
        rig.rightShoulder.rotation.x = -1.3;
        rig.rightElbow.rotation.x = -1.7;
        rig.rightWrist.rotation.x = -0.2;
        break;
      }

      case 'DASH_FORWARD': {
        // High-speed anime ninja sprint lean
        rig.hips.position.y = 0.68;
        rig.spine.rotation.x = 0.75;
        rig.neck.rotation.x = -0.55; // looks forward
        rig.leftShoulder.rotation.x = 1.2;
        rig.rightShoulder.rotation.x = 1.2;
        rig.leftHip.rotation.x = 0.6;
        rig.rightHip.rotation.x = -0.7;
        rig.leftKnee.rotation.x = 0.8;
        rig.leftAnkle.rotation.x = -0.3;
        rig.rightAnkle.rotation.x = 0.4;
        break;
      }

      case 'DASH_BACK': {
        // Comic panic back hop
        rig.hips.position.y = 0.98;
        rig.spine.rotation.x = -0.45;
        rig.leftShoulder.rotation.x = -1.6;
        rig.rightShoulder.rotation.x = -1.6;
        rig.leftKnee.rotation.x = 0.8;
        rig.rightKnee.rotation.x = 0.8;
        rig.leftAnkle.rotation.x = 0.3;
        rig.rightAnkle.rotation.x = 0.3;
        break;
      }

      case 'CROUCH': {
        // Deep comical squat
        rig.hips.position.y = 0.45;
        rig.leftHip.rotation.x = -0.9;
        rig.leftKnee.rotation.x = 1.6;
        rig.leftAnkle.rotation.x = -0.4;
        rig.rightHip.rotation.x = -0.9;
        rig.rightKnee.rotation.x = 1.6;
        rig.rightAnkle.rotation.x = -0.4;
        rig.spine.rotation.x = 0.35;
        rig.leftShoulder.rotation.x = -1.4;
        rig.rightShoulder.rotation.x = -1.4;
        break;
      }

      case 'BLOCKING':
      case 'BLOCKSTUN': {
        // Shell Defense: Fists held up shielding the face
        rig.spine.rotation.x = -0.15;
        rig.leftShoulder.rotation.x = -1.9;
        rig.leftShoulder.rotation.z = -0.35;
        rig.leftElbow.rotation.x = -1.8;
        rig.leftWrist.rotation.x = -0.3;
        rig.rightShoulder.rotation.x = -1.9;
        rig.rightShoulder.rotation.z = 0.35;
        rig.rightElbow.rotation.x = -1.8;
        rig.rightWrist.rotation.x = -0.3;
        rig.neck.rotation.x = 0.25;
        break;
      }

      case 'JUMPING': {
        // Aerial tuck & spin pose
        rig.hips.position.y = 0.95;
        rig.spine.rotation.x = 0.25;
        rig.leftHip.rotation.x = -0.7;
        rig.leftKnee.rotation.x = 1.2;
        rig.leftAnkle.rotation.x = 0.3;
        rig.rightHip.rotation.x = 0.4;
        rig.rightKnee.rotation.x = 0.3;
        rig.rightAnkle.rotation.x = 0.3;
        rig.leftShoulder.rotation.x = -1.7;
        rig.rightShoulder.rotation.x = -1.4;
        break;
      }

      case 'ATTACKING': {
        this.animateAttack(rig, f, state);
        break;
      }

      case 'HITSTUN': {
        // Exaggerated hit reaction: head snaps back, spine arches, limbs flail
        rig.neck.rotation.x = -0.75;
        rig.spine.rotation.x = -0.65;
        rig.leftShoulder.rotation.x = 0.7;
        rig.leftShoulder.rotation.z = 0.5;
        rig.rightShoulder.rotation.x = 0.5;
        rig.rightShoulder.rotation.z = -0.5;
        rig.leftKnee.rotation.x = 0.6;
        rig.rightKnee.rotation.x = 0.6;
        break;
      }

      case 'KNOCKDOWN': {
        // Knockdown on mat
        rig.bodyMesh.rotation.x = -Math.PI / 2;
        rig.hips.position.y = 0.18;
        rig.leftKnee.rotation.x = 0.9;
        rig.rightKnee.rotation.x = 0.6;
        break;
      }

      case 'VICTORY': {
        if (f.config.id === 'fighter_moshon') {
          // Fixes his glasses, zips his jacket, and quickly checks his phone nervously
          rig.hips.position.y = 0.85;
          rig.spine.rotation.x = -0.05;
          // Right hand fixes glasses then pulls out phone
          const cycle = (t * 2.0) % 2;
          if (cycle < 1.0) {
            // First fixes glasses
            rig.rightShoulder.rotation.x = -1.55;
            rig.rightShoulder.rotation.y = 0.4;
            rig.rightElbow.rotation.x = -2.1;
            rig.rightWrist.rotation.x = -0.2;
            // Left hand zips up track jacket to collar
            rig.leftShoulder.rotation.x = -0.7;
            rig.leftElbow.rotation.x = -1.4;
          } else {
            // Then checks phone nervously
            if (rig.phone3DProp) rig.phone3DProp.visible = true;
            rig.rightShoulder.rotation.x = -1.2;
            rig.rightShoulder.rotation.y = 0.2;
            rig.rightElbow.rotation.x = -1.6;
            // Nervous tremble
            rig.rightWrist.rotation.z = Math.sin(t * 12.0) * 0.12;
            if (rig.phonePopupMesh && rig.phoneMissedTexture) {
              (rig.phonePopupMesh.material as THREE.MeshBasicMaterial).map = rig.phoneMissedTexture;
              rig.phonePopupMesh.visible = true;
              rig.phonePopupMesh.position.set(0, 2.3, 0.2);
            }
          }
          rig.head.rotation.y = f.facing === 1 ? -0.25 : 0.25;
        } else {
          // Champion flexing celebration
          const flexCycle = t * 4.5;
          rig.hips.position.y = 0.85 + Math.abs(Math.sin(flexCycle)) * 0.12;
          rig.spine.rotation.x = -0.15;
          rig.leftShoulder.rotation.x = -2.6 + Math.sin(flexCycle) * 0.25;
          rig.leftElbow.rotation.x = -1.8;
          rig.rightShoulder.rotation.x = -2.6 - Math.sin(flexCycle) * 0.25;
          rig.rightElbow.rotation.x = -1.8;
          rig.head.rotation.y = Math.sin(flexCycle) * 0.3;
        }
        break;
      }

      case 'DEFEAT': {
        if (f.config.id === 'fighter_moshon') {
          // Phone rings with "LINOY CALLING", he panics, drops down and covers his head in pure fear!
          rig.bodyMesh.rotation.x = Math.PI / 3.2;
          rig.hips.position.y = 0.22;
          rig.leftKnee.rotation.x = 1.35;
          rig.rightKnee.rotation.x = 1.35;
          rig.spine.rotation.x = 0.55;
          // Both arms desperately covering his head
          rig.leftShoulder.rotation.x = -2.2;
          rig.leftShoulder.rotation.z = -0.55;
          rig.leftElbow.rotation.x = -2.3;
          rig.rightShoulder.rotation.x = -2.2;
          rig.rightShoulder.rotation.z = 0.55;
          rig.rightElbow.rotation.x = -2.3;
          rig.head.rotation.x = 0.45;
          // Shaking/trembling in panic
          rig.spine.rotation.z = Math.sin(t * 14.0) * 0.09;
          if (rig.phonePopupMesh && rig.phoneCallTexture) {
            (rig.phonePopupMesh.material as THREE.MeshBasicMaterial).map = rig.phoneCallTexture;
            rig.phonePopupMesh.visible = true;
            rig.phonePopupMesh.position.set(0, 1.6, 0.4);
          }
        } else {
          // Dizzy tumble & collapse
          rig.bodyMesh.rotation.x = Math.PI / 2.2;
          rig.hips.position.y = 0.18;
          rig.spine.rotation.x = 0.3;
          rig.head.rotation.y = Math.sin(t * 6.0) * 0.45;
        }
        break;
      }

      default:
        break;
    }

    // Special Comic K.O. fall
    if (f.isKo) {
      const koType = f.config.koAnimation?.type || 'default_stars';
      const koSeq = state?.koSequenceTicks ?? 0;
      const elapsedSec = (240 - koSeq) / 60; // 0.0 to 4.0s

      if (koType === 'dandan_dart' || f.config.id === 'fighter_dandan') {
        // DANDAN: Spins in the air twice, lands face-down, nose sticks into mat like a dart with legs up in the air
        if (koSeq > 185) {
          // Mid-air double spin
          const spinProg = Math.min(1.0, (240 - koSeq) / 55);
          rig.bodyMesh.rotation.z = spinProg * Math.PI * 4 * f.facing;
          rig.bodyMesh.rotation.x = Math.sin(spinProg * Math.PI * 4) * 0.35;
          rig.hips.position.y = 1.3 - spinProg * 0.7;
        } else {
          // Dart stuck in mat: upside down with big nose in mat and legs wobbling up in the air
          rig.bodyMesh.rotation.z = Math.PI; // upside down
          rig.bodyMesh.rotation.x = 0.14;
          rig.bodyMesh.position.y = 0.35;
          rig.hips.position.y = 1.08;
          rig.spine.rotation.x = 0.05;
          // Legs straight up, wobbling comically
          const legWobble = Math.sin(t * 8.0) * 0.12;
          rig.leftHip.rotation.x = 0.1 + legWobble;
          rig.rightHip.rotation.x = -0.1 - legWobble;
          rig.leftKnee.rotation.x = 0.25 + legWobble;
          rig.rightKnee.rotation.x = 0.25 - legWobble;
          rig.leftShoulder.rotation.z = 0.85;
          rig.rightShoulder.rotation.z = -0.85;
        }
      } else if (koType === 'moshon_phone' || f.config.id === 'fighter_moshon') {
        // MOSHON: Falls flat on back, phone rings, ghost floats and pulled back
        if (koSeq > 195) {
          const fallProg = Math.min(1.0, (240 - koSeq) / 45);
          rig.bodyMesh.rotation.x = -fallProg * (Math.PI / 2);
          rig.hips.position.y = 0.85 - fallProg * 0.69;
        } else {
          rig.bodyMesh.rotation.x = -Math.PI / 2.05;
          rig.hips.position.y = 0.16;
          rig.spine.rotation.x = 0.05;
          rig.leftKnee.rotation.x = 0.25;
          rig.rightKnee.rotation.x = 0.25;
          rig.leftShoulder.rotation.x = 0.4;
          rig.rightShoulder.rotation.x = 0.4;
          rig.head.rotation.x = 0.2;
        }
      } else if (koType === 'matthew_timber' || f.config.id === 'fighter_matthew') {
        // MATTHEW: Sways back and forth (TIMBER!), falls slowly like a tree, belly bounces twice
        if (koSeq > 165) {
          if (elapsedSec < 1.1) {
            // Groggily sways back and forth like a tall tree
            const sway = Math.sin(elapsedSec * 5.5) * 0.28;
            rig.bodyMesh.rotation.z = sway * f.facing;
            rig.bodyMesh.rotation.x = -0.06;
          } else {
            // Falls backward stiffly like a giant tree
            const fallProg = Math.min(1.0, (elapsedSec - 1.1) / 0.65);
            rig.bodyMesh.rotation.x = -fallProg * (Math.PI / 2);
            rig.hips.position.y = 0.85 - fallProg * 0.67;
          }
        } else {
          // Landed flat on back with belly bouncing twice
          const bounceTicks = 165 - koSeq;
          const bounce = Math.sin(bounceTicks * 0.22) * Math.exp(-bounceTicks * 0.05) * 0.4;
          rig.bodyMesh.rotation.x = -Math.PI / 2.05;
          rig.hips.position.y = 0.18;
          rig.spine.scale.set(1.0, 1.0 + Math.max(-0.2, bounce), 1.0);
          rig.leftKnee.rotation.x = 0.3;
          rig.rightKnee.rotation.x = 0.3;
          rig.leftShoulder.rotation.x = 0.3;
          rig.rightShoulder.rotation.x = 0.3;
        }
      } else {
        // DEFAULT / OTHER FIGHTERS: spin and fall flat on back with circling stars
        if (!f.isGrounded) {
          rig.bodyMesh.rotation.z += 0.28 * f.facing;
          rig.bodyMesh.rotation.x += 0.18;
        } else {
          rig.bodyMesh.rotation.x = -Math.PI / 2.1;
          rig.hips.position.y = 0.18;
          rig.leftKnee.rotation.x = 0.5;
          rig.rightKnee.rotation.x = 0.5;
          rig.leftShoulder.rotation.x = 0.6;
          rig.rightShoulder.rotation.x = 0.6;
        }
      }
    }

    // Turn head slightly toward side-view camera for Dandan & Moshon so face features are clearly visible (except during horizontal nose attacks)
    const isNoseAttackState = f.actionState === 'ATTACKING' && (f.currentMove?.animType === 'the_big_lie' || f.currentMove?.name === 'The Big Lie' || f.currentMove?.animType === 'nose_poke');
    if (!isNoseAttackState && (f.config.id === 'fighter_dandan' || f.config.id === 'fighter_moshon') && f.actionState !== 'DEFEAT' && !f.isKo && (!f.counterStanceTicks || f.counterStanceTicks <= 0)) {
      rig.head.rotation.y += f.facing === 1 ? -0.38 : 0.38;
    }
  }

  /**
   * Procedural attack poses that rotate joints cleanly
   */
  private animateAttack(rig: CharacterRig, f: FighterState, state?: GameState) {
    if (!f.currentMove) return;
    const { moveFrame } = f;
    const move = f.currentMove;

    // Tool belt swings dynamically on spinning kick
    if (move.animType === 'hk' && rig.toolBeltMesh) {
      rig.toolBeltMesh.rotation.y = moveFrame * 0.45;
    }

    // Handheld props visibility
    if (rig.wrenchProp) {
      const isWrench =
        move.animType === 'wrench_swing' ||
        move.animType === 'wrench_launcher' ||
        move.name.includes('Wrench') ||
        move.name === 'Counter Wrench Uppercut';
      rig.wrenchProp.visible = isWrench;
      if (isWrench) {
        rig.wrenchProp.rotation.x = -Math.PI / 3.5;
      }
    }

    if (rig.drillProp) {
      const isDrill = move.animType === 'drill' || move.name === 'Maintenance Drill';
      rig.drillProp.visible = isDrill;
    }

    if (rig.carDoorProp) {
      const isCarDoor = move.animType === 'car_door' || move.animType === 'holon_car';
      rig.carDoorProp.visible = isCarDoor;
    }

    if (rig.whiteCarProp) {
      rig.whiteCarProp.visible = move.animType === 'holon_car';
    }

    if (rig.steamEarsGroup) {
      rig.steamEarsGroup.visible = move.animType === 'linoy_rage';
    }

    if (rig.linoyRageAura) {
      rig.linoyRageAura.visible = move.animType === 'linoy_rage';
    }

    switch (move.animType) {
      case 'the_big_lie': {
        // "The Big Lie": He says "I swear it's true!", his nose grows horizontally across the screen stabbing the opponent!
        const startup = move.startupFrames;
        const peak = startup + 14;
        rig.head.rotation.set(0, 0, 0); // Point head strictly horizontal along fight axis
        rig.spine.rotation.x = 0.20;
        rig.leftShoulder.rotation.x = 0.55;
        rig.rightShoulder.rotation.x = 0.55;

        const baseY = 0.22;
        const baseZ = 0.376;
        if (moveFrame < startup) {
          rig.noseMesh?.scale.set(1, 1, 1);
          rig.noseMesh?.position.set(0, baseY, baseZ);
        } else if (moveFrame <= peak) {
          // Nose visibly grows horizontally across the screen towards opponent
          const prog = (moveFrame - startup) / 14;
          const stretchZ = 1 + prog * 24.0;
          rig.noseMesh?.scale.set(1.15, 1.15, stretchZ);
          rig.noseMesh?.position.set(0, baseY, baseZ);
        } else if (moveFrame < move.totalFrames - 10) {
          // Fully extended, stabbing opponent across screen
          rig.noseMesh?.scale.set(1.15, 1.15, 25.0);
          rig.noseMesh?.position.set(0, baseY, baseZ);
        } else {
          // Nose rapidly shrinks back to normal
          const recProg = (move.totalFrames - moveFrame) / 10;
          rig.noseMesh?.scale.set(1 + recProg * 0.15, 1 + recProg * 0.15, 1 + recProg * 12.0);
          rig.noseMesh?.position.set(0, baseY, baseZ);
        }
        break;
      }

      case 'the_eliminator': {
        // "The Eliminator": pushes up black glasses with glint, rapid 8-punch barrage, finishing straight push kick
        const startup = move.startupFrames;
        if (moveFrame < startup) {
          // Pushes up thick black rectangular glasses with right hand
          const t = moveFrame / startup;
          rig.spine.rotation.y = -0.15 * t;
          rig.rightShoulder.rotation.x = -1.65 * t;
          rig.rightShoulder.rotation.y = 0.35 * t;
          rig.rightElbow.rotation.x = -2.1 * t;
          rig.rightWrist.rotation.x = -0.2 * t;
          rig.leftShoulder.rotation.x = -0.6 * t;
          rig.leftElbow.rotation.x = -1.4 * t;
        } else if (moveFrame < startup + 24) {
          // Lightning-fast 8-punch barrage alternating left and right fists!
          const punchSpeed = (moveFrame - startup) * 1.8;
          rig.spine.rotation.y = Math.sin(punchSpeed * 0.5) * 0.45;
          rig.leftShoulder.rotation.x = -Math.PI / 2 + Math.sin(punchSpeed) * 1.1;
          rig.leftElbow.rotation.x = -0.15;
          rig.rightShoulder.rotation.x = -Math.PI / 2 + Math.cos(punchSpeed) * 1.1;
          rig.rightElbow.rotation.x = -0.15;
          rig.leftGloveMesh.scale.set(1.4, 1.4, 1.4);
          rig.rightGloveMesh.scale.set(1.4, 1.4, 1.4);
        } else if (moveFrame < move.totalFrames - 8) {
          // Finishing Straight Push Kick!
          rig.spine.rotation.x = -0.45;
          rig.rightHip.rotation.x = -1.55;
          rig.rightKnee.rotation.x = 0;
          rig.rightAnkle.rotation.x = 0.45;
          rig.rightBootMesh.scale.set(1.45, 1.45, 1.45);
          rig.leftShoulder.rotation.x = 0.4;
          rig.rightShoulder.rotation.x = 0.4;
        } else {
          // Recovery back to fight stance
          const t = (move.totalFrames - moveFrame) / 8;
          rig.rightHip.rotation.x = -1.55 * t;
          rig.rightBootMesh.scale.set(1 + 0.45 * t, 1 + 0.45 * t, 1 + 0.45 * t);
        }
        break;
      }

      case 'wrench_swing': {
        // Wrench Swing: winding back and swinging wide medium-range arc!
        const startup = move.startupFrames;
        if (moveFrame < startup) {
          const t = moveFrame / startup;
          rig.spine.rotation.y = -t * 0.75;
          rig.rightShoulder.rotation.x = -Math.PI / 3 * t;
          rig.rightShoulder.rotation.y = -t * 0.85;
          rig.rightElbow.rotation.x = -1.6;
        } else if (moveFrame < startup + move.activeFrames) {
          rig.spine.rotation.y = 0.8;
          rig.rightShoulder.rotation.x = -Math.PI / 2;
          rig.rightShoulder.rotation.y = 0.65;
          rig.rightElbow.rotation.x = -0.25;
        } else {
          const t = (moveFrame - startup - move.activeFrames) / move.recoveryFrames;
          rig.spine.rotation.y = 0.8 * (1 - t);
          rig.rightShoulder.rotation.x = -Math.PI / 2 * (1 - t * 0.6);
          rig.rightElbow.rotation.x = -1.2 * t;
        }
        break;
      }

      case 'wrench_launcher': {
        // Wrench Launcher: deep crouch scoop then launch upward into sky!
        const startup = move.startupFrames;
        if (moveFrame < startup) {
          const t = moveFrame / startup;
          rig.hips.position.y = 0.65; // crouches low
          rig.spine.rotation.x = 0.35 * t;
          rig.rightShoulder.rotation.x = 0.6 * t;
          rig.rightElbow.rotation.x = -0.5;
        } else if (moveFrame < startup + move.activeFrames) {
          rig.hips.position.y = 1.02;
          rig.spine.rotation.x = -0.35;
          rig.rightShoulder.rotation.x = -Math.PI * 0.88; // points straight up into sky!
          rig.rightElbow.rotation.x = -0.15;
          rig.leftShoulder.rotation.x = -Math.PI * 0.55;
        } else {
          const t = (moveFrame - startup - move.activeFrames) / move.recoveryFrames;
          rig.hips.position.y = 0.85 + (1 - t) * 0.12;
          rig.rightShoulder.rotation.x = -Math.PI * 0.88 * (1 - t * 0.65);
        }
        break;
      }

      case 'drill': {
        // Maintenance Drill: dash forward with vibrating power drill
        rig.spine.rotation.x = 0.45;
        rig.rightShoulder.rotation.x = -Math.PI / 2;
        rig.rightShoulder.rotation.y = 0.25;
        rig.rightElbow.rotation.x = -0.2;
        rig.rightWrist.rotation.z = Math.sin(moveFrame * 3.5) * 0.18; // vibrating drill
        rig.leftShoulder.rotation.x = 0.4;
        break;
      }

      case 'nose_poke': {
        // Nose Poke: headbutts lunging forward with oversized cone nose
        const peak = move.startupFrames;
        rig.head.rotation.set(0, 0, 0);
        if (moveFrame <= peak) {
          const t = moveFrame / peak;
          rig.spine.rotation.x = 0.55 * t;
          rig.neck.rotation.x = 0.45 * t;
          rig.leftShoulder.rotation.x = 0.8 * t;
          rig.rightShoulder.rotation.x = 0.8 * t;
        } else {
          const t = (moveFrame - peak) / (move.totalFrames - peak);
          rig.spine.rotation.x = 0.55 * (1 - t);
          rig.neck.rotation.x = 0.45 * (1 - t);
          rig.leftShoulder.rotation.x = 0.8 * (1 - t);
          rig.rightShoulder.rotation.x = 0.8 * (1 - t);
        }
        break;
      }

      case 'fake_ko': {
        // "It Wasn't Me!" fakes KO flat on canvas floor
        rig.bodyMesh.rotation.x = Math.PI / 2.15;
        rig.hips.position.y = 0.16;
        rig.leftKnee.rotation.x = 0.6;
        rig.rightKnee.rotation.x = 0.5;
        rig.leftShoulder.rotation.x = 1.4;
        rig.rightShoulder.rotation.x = 1.4;
        rig.head.rotation.y = 0.35;
        break;
      }

      case 'rocket_dive': {
        // "Jasmine Power": superhero rocket dive pose horizontal flying
        rig.bodyMesh.rotation.x = Math.PI / 2.05;
        rig.hips.position.y = 0.9;
        rig.neck.rotation.x = -Math.PI / 2.3; // head tilts up to look forward
        rig.leftShoulder.rotation.x = -Math.PI * 0.95;
        rig.leftElbow.rotation.x = -0.05;
        rig.rightShoulder.rotation.x = -Math.PI * 0.95;
        rig.rightElbow.rotation.x = -0.05;
        rig.leftHip.rotation.x = 0.15;
        rig.rightHip.rotation.x = -0.15;
        break;
      }
      case 'lp': {
        // Quick Jab: fast wind-up and snap (ease-in), slower recovery (ease-out)
        const peak = move.startupFrames;
        if (moveFrame <= peak) {
          const raw = Math.min(1, Math.max(0, moveFrame / peak));
          const t = Math.pow(raw, 2.2); // Fast wind-up and snap into strike
          rig.spine.rotation.y = t * 0.35;
          rig.leftShoulder.rotation.x = -Math.PI / 2;
          rig.leftShoulder.rotation.y = t * 0.3;
          rig.leftElbow.rotation.x = -0.15; // Arm thrusts straight!
          rig.leftWrist.rotation.x = -0.25;
          rig.leftGloveMesh.scale.set(1 + 0.2 * t, 1 + 0.2 * t, 1 + 0.2 * t);
        } else {
          const raw = Math.min(1, Math.max(0, (moveFrame - peak) / (move.totalFrames - peak)));
          const t = Math.pow(raw, 0.6); // Slower recovery ease-out
          const factor = 1 - t;
          rig.spine.rotation.y = 0.35 * factor;
          rig.leftShoulder.rotation.x = -Math.PI / 2 * (1 - t * 0.5);
          rig.leftElbow.rotation.x = -1.55 * t;
          rig.leftWrist.rotation.x = -0.25 * factor;
          rig.leftGloveMesh.scale.set(1 + 0.2 * factor, 1 + 0.2 * factor, 1 + 0.2 * factor);

          // Moshon adjusts glasses with right hand after jab
          if (f.config.id === 'fighter_moshon' && raw > 0.35) {
            rig.rightShoulder.rotation.x = -1.5 * (raw - 0.35) * 1.5;
            rig.rightElbow.rotation.x = -1.8;
          }
        }
        break;
      }

      case 'hp': {
        // Mega Haymaker: huge comical cartoon windup then explosive fist snap!
        const startup = move.startupFrames;
        if (moveFrame < startup) {
          // Windup: torso coils back, shoulder draws way back, elbow bends tight, fist swells!
          const raw = Math.min(1, Math.max(0, moveFrame / startup));
          const t = Math.pow(raw, 2.0); // Fast wind-up and snap into active frames
          rig.spine.rotation.y = -t * 0.85;
          rig.spine.rotation.x = -0.25 * t;
          rig.rightShoulder.rotation.x = 0.4 * t;
          rig.rightShoulder.rotation.y = -t * 1.5;
          rig.rightElbow.rotation.x = -1.9;
          rig.rightWrist.rotation.x = 0.4 * t;
          rig.rightGloveMesh.scale.set(1 + t * 0.8, 1 + t * 0.8, 1 + t * 0.8);
        } else if (moveFrame < startup + move.activeFrames) {
          // Explosive forward swing!
          rig.spine.rotation.y = 0.85;
          rig.spine.rotation.x = 0.25;
          rig.rightShoulder.rotation.x = -Math.PI / 2;
          rig.rightShoulder.rotation.y = 0.75;
          rig.rightElbow.rotation.x = -0.15; // Arm snaps completely extended!
          rig.rightWrist.rotation.x = -0.35;
          rig.rightGloveMesh.scale.set(1.9, 1.9, 1.9); // Giant punch!
        } else {
          // Recovery: slower lingering ease-out back to stance
          const raw = Math.min(1, Math.max(0, (moveFrame - startup - move.activeFrames) / move.recoveryFrames));
          const t = Math.pow(raw, 0.6); // Slower recovery ease-out
          const factor = 1 - t;
          rig.spine.rotation.y = 0.85 * factor;
          rig.rightShoulder.rotation.x = -Math.PI / 2 * factor;
          rig.rightElbow.rotation.x = -1.45 * t;
          rig.rightWrist.rotation.x = -0.35 * factor;
          rig.rightGloveMesh.scale.set(1 + 0.9 * factor, 1 + 0.9 * factor, 1 + 0.9 * factor);
        }
        break;
      }

      case 'lk': {
        // Shin Punt: hip swings forward, knee snaps straight into low kick
        const peak = move.startupFrames;
        if (moveFrame <= peak) {
          const raw = Math.min(1, Math.max(0, moveFrame / peak));
          const t = Math.pow(raw, 2.2); // Fast wind-up and snap
          rig.spine.rotation.x = -0.15 * t;
          rig.leftHip.rotation.x = -t * 0.95;
          rig.leftKnee.rotation.x = -0.15;
          rig.leftAnkle.rotation.x = 0.35;
          rig.leftBootMesh.scale.set(1 + 0.2 * t, 1 + 0.2 * t, 1 + 0.2 * t);
        } else {
          const raw = Math.min(1, Math.max(0, (moveFrame - peak) / (move.totalFrames - peak)));
          const t = Math.pow(raw, 0.6); // Slower recovery ease-out
          const factor = 1 - t;
          rig.leftHip.rotation.x = -0.95 * factor;
          rig.leftKnee.rotation.x = 0.45 * t;
          rig.leftAnkle.rotation.x = 0.35 * factor;
          rig.leftBootMesh.scale.set(1 + 0.2 * factor, 1 + 0.2 * factor, 1 + 0.2 * factor);
        }
        break;
      }

      case 'hk': {
        // The Yeet Kick: High karate kick / dropkick
        const startup = move.startupFrames;
        if (moveFrame < startup) {
          const raw = Math.min(1, Math.max(0, moveFrame / startup));
          const t = Math.pow(raw, 2.0); // Fast windup and snap
          rig.spine.rotation.x = -t * 0.65; // deep backward lean
          rig.rightHip.rotation.x = -t * 0.7;
          rig.rightKnee.rotation.x = 1.1 * t;
          rig.rightAnkle.rotation.x = -0.2 * t;
        } else if (moveFrame < startup + move.activeFrames) {
          // Full kick extension straight up into opponent's face
          rig.spine.rotation.x = -0.75;
          rig.rightHip.rotation.x = -1.65;
          rig.rightKnee.rotation.x = -0.1;
          rig.rightAnkle.rotation.x = 0.55;
          rig.rightBootMesh.scale.set(1.8, 1.8, 1.8);
        } else {
          const raw = Math.min(1, Math.max(0, (moveFrame - startup - move.activeFrames) / move.recoveryFrames));
          const t = Math.pow(raw, 0.6); // Slower recovery ease-out
          const factor = 1 - t;
          rig.spine.rotation.x = -0.75 * factor;
          rig.rightHip.rotation.x = -1.65 * factor;
          rig.rightAnkle.rotation.x = 0.55 * factor;
          rig.rightBootMesh.scale.set(1 + 0.8 * factor, 1 + 0.8 * factor, 1 + 0.8 * factor);
        }
        break;
      }

      case 'super': {
        if (move.name === 'The Big Lie') {
          // "The Big Lie": nose visibly stretches horizontally across screen
          const startup = move.startupFrames;
          const peak = startup + 14;
          rig.head.rotation.set(0, 0, 0);
          rig.spine.rotation.x = 0.20;
          rig.leftShoulder.rotation.x = 0.55;
          rig.rightShoulder.rotation.x = 0.55;

          const baseY = 0.22;
          const baseZ = 0.376;
          if (moveFrame < startup) {
            rig.noseMesh?.scale.set(1, 1, 1);
            rig.noseMesh?.position.set(0, baseY, baseZ);
          } else if (moveFrame <= peak) {
            const prog = (moveFrame - startup) / 14;
            const stretchZ = 1 + prog * 24.0;
            rig.noseMesh?.scale.set(1.15, 1.15, stretchZ);
            rig.noseMesh?.position.set(0, baseY, baseZ);
          } else if (moveFrame < move.totalFrames - 10) {
            rig.noseMesh?.scale.set(1.15, 1.15, 25.0);
            rig.noseMesh?.position.set(0, baseY, baseZ);
          } else {
            const recProg = (move.totalFrames - moveFrame) / 10;
            rig.noseMesh?.scale.set(1 + recProg * 0.15, 1 + recProg * 0.15, 1 + recProg * 12.0);
            rig.noseMesh?.position.set(0, baseY, baseZ);
          }
        } else if (move.name === 'The Eliminator') {
          // "The Eliminator": glasses push + 8-punch barrage + straight push kick
          const startup = move.startupFrames;
          if (moveFrame < startup) {
            const t = moveFrame / startup;
            rig.rightShoulder.rotation.x = -1.65 * t;
            rig.rightElbow.rotation.x = -2.1 * t;
          } else if (moveFrame < startup + 24) {
            const punchSpeed = (moveFrame - startup) * 1.8;
            rig.spine.rotation.y = Math.sin(punchSpeed * 0.5) * 0.45;
            rig.leftShoulder.rotation.x = -Math.PI / 2 + Math.sin(punchSpeed) * 1.1;
            rig.leftElbow.rotation.x = -0.15;
            rig.rightShoulder.rotation.x = -Math.PI / 2 + Math.cos(punchSpeed) * 1.1;
            rig.rightElbow.rotation.x = -0.15;
            rig.leftGloveMesh.scale.set(1.4, 1.4, 1.4);
            rig.rightGloveMesh.scale.set(1.4, 1.4, 1.4);
          } else if (moveFrame < move.totalFrames - 8) {
            rig.spine.rotation.x = -0.45;
            rig.rightHip.rotation.x = -1.55;
            rig.rightKnee.rotation.x = 0;
            rig.rightBootMesh.scale.set(1.45, 1.45, 1.45);
          }
        } else {
          // Bob's Tornado Bonk Barrage (360 whirlwind spin with glowing oversized fists!)
          const spin = moveFrame * 0.65;
          rig.bodyMesh.rotation.y += Math.sin(spin) * 2.2;
          rig.leftShoulder.rotation.x = -Math.PI / 2 + Math.sin(spin * 2) * 0.7;
          rig.leftElbow.rotation.x = -0.2;
          rig.rightShoulder.rotation.x = -Math.PI / 2 - Math.sin(spin * 2) * 0.7;
          rig.rightElbow.rotation.x = -0.2;
          rig.leftGloveMesh.scale.set(2.2, 2.2, 2.2);
          rig.rightGloveMesh.scale.set(2.2, 2.2, 2.2);
        }
        break;
      }

      case 'service_van':
      case 'excavator': {
        // Dandan's Level 2 Super: "SERVICE CALL!"
        // Drives detailed white commercial service van into the ring, headlights on, horn honks ("BEEP BEEP!"),
        // runs over opponent flattening them like a pancake, leans out window shouting "Technician has arrived!", and drives off.
        if (rig.serviceVanProp) {
          rig.serviceVanProp.visible = true;
          const startup = move.startupFrames;
          const activeEnd = startup + move.activeFrames;

          if (moveFrame < startup) {
            // Charging into the ring from the side, headlights glowing, horn ready
            const t = moveFrame / startup;
            rig.serviceVanProp.position.set(-1.8 + t * 1.8, 0, 0);
            if (rig.serviceVanWheels) {
              rig.serviceVanWheels.forEach(w => { w.rotation.x += 0.4; });
            }
            // Dandan seated inside gripping steering wheel
            rig.hips.position.set(0.12, 0.65, 0.18);
            rig.leftShoulder.rotation.x = -1.1;
            rig.rightShoulder.rotation.x = -1.1;
          } else if (moveFrame < activeEnd) {
            // Running over the opponent! Opponent flattens like a pancake (f.pancakeTicks)
            const t = (moveFrame - startup) / move.activeFrames;
            rig.serviceVanProp.position.set(t * 1.4, 0, 0);
            if (rig.serviceVanWheels) {
              rig.serviceVanWheels.forEach(w => { w.rotation.x += 0.5; });
            }
            rig.hips.position.set(0.12 + t * 0.1, 0.65, 0.18);
          } else {
            // Recovery: Leaning out the driver's window waving/shouting "Technician has arrived!" and driving off!
            const t = (moveFrame - activeEnd) / move.recoveryFrames;
            rig.serviceVanProp.position.set(1.4 + t * 2.2, 0, 0);
            if (rig.serviceVanWheels) {
              rig.serviceVanWheels.forEach(w => { w.rotation.x += 0.6; });
            }
            // Leaning out the open driver side window (left side, camera facing)
            rig.hips.position.set(0.24, 0.72, 0.35);
            rig.spine.rotation.z = -0.35;
            rig.spine.rotation.y = 0.45;
            rig.head.rotation.y = 0.55;
            rig.leftShoulder.rotation.x = -1.5;
            rig.leftShoulder.rotation.z = 0.4;
            rig.leftElbow.rotation.x = -0.3; // Waving arm out window
          }
        } else if (rig.excavatorProp && rig.excavatorArm && rig.excavatorBucket) {
          rig.excavatorProp.visible = true;
          // Dandan seated cleanly inside the cab operating joysticks
          rig.hips.position.set(0, 0.60, -0.05);
          rig.leftHip.rotation.x = -1.2;
          rig.leftKnee.rotation.x = 1.6;
          rig.rightHip.rotation.x = -1.2;
          rig.rightKnee.rotation.x = 1.6;
          rig.leftShoulder.rotation.x = -1.15;
          rig.leftShoulder.rotation.z = 0.15;
          rig.leftElbow.rotation.x = -0.85;
          rig.rightShoulder.rotation.x = -1.15;
          rig.rightShoulder.rotation.z = -0.15;
          rig.rightElbow.rotation.x = -0.85;
          rig.head.rotation.set(0, 0, 0);

          const startup = move.startupFrames;
          if (moveFrame < startup) {
            // Hopping into cab, boom lowering to ground
            rig.excavatorArm.rotation.x = 0.45;
            rig.excavatorBucket.rotation.x = 0.25;
          } else if (moveFrame < startup + 16) {
            // Driving forward & scooping up opponent high into the air!
            const t = (moveFrame - startup) / 16;
            rig.excavatorArm.rotation.x = 0.45 - t * 1.65; // Lifts boom high into air!
            rig.excavatorBucket.rotation.x = 0.25 - t * 0.75; // Bucket scoops up
          } else if (moveFrame < move.totalFrames - 10) {
            // Dump opponent forcefully onto the floor!
            rig.excavatorArm.rotation.x = -1.1;
            rig.excavatorBucket.rotation.x = 1.5; // Bucket dumps downward slamming opponent onto canvas
          } else {
            // Retract boom before finishing
            const t = (move.totalFrames - moveFrame) / 10;
            rig.excavatorArm.rotation.x = -0.2 * t;
            rig.excavatorBucket.rotation.x = 0;
          }
        }
        break;
      }

      case 'car_door': {
        // "Car Door Slam": white car door appears and he slams it into the opponent
        if (rig.carDoorProp) {
          rig.carDoorProp.visible = true;
          const startup = move.startupFrames;
          if (moveFrame < startup) {
            const t = moveFrame / startup;
            rig.spine.rotation.y = -t * 0.75;
            rig.rightShoulder.rotation.x = -0.5 * t;
            rig.rightElbow.rotation.x = -1.2;
            rig.carDoorProp.rotation.y = -t * 0.9;
          } else if (moveFrame < startup + move.activeFrames) {
            // Explosive forward car door slam!
            rig.spine.rotation.y = 0.85;
            rig.rightShoulder.rotation.x = -Math.PI / 2.2;
            rig.rightElbow.rotation.x = -0.2;
            rig.leftShoulder.rotation.x = -Math.PI / 3;
            rig.carDoorProp.rotation.y = 0.8;
            rig.carDoorProp.position.set(0.9, 0.7, 0.4);
          } else {
            const t = (moveFrame - startup - move.activeFrames) / move.recoveryFrames;
            rig.spine.rotation.y = 0.85 * (1 - t);
            rig.carDoorProp.rotation.y = 0.8 * (1 - t);
          }
        }
        break;
      }

      case 'holon_car': {
        // "Holon Parking" Level 2 Super: white car drives into ring, hits opponent, he gets out and slams door!
        if (rig.whiteCarProp && rig.carDoorProp) {
          rig.whiteCarProp.visible = true;
          const startup = move.startupFrames;
          if (moveFrame < startup + 16) {
            // Car charging into the ring and hitting opponent!
            const t = moveFrame / (startup + 16);
            rig.whiteCarProp.position.set(0.6 * t, 0, 0);
            rig.hips.position.y = 0.85;
          } else if (moveFrame < move.totalFrames - 12) {
            // Steps out and slams car door twice
            rig.carDoorProp.visible = true;
            const slamPhase = Math.sin((moveFrame - startup - 16) * 0.6);
            rig.carDoorProp.rotation.y = slamPhase * 0.9;
            rig.rightShoulder.rotation.x = -Math.PI / 2.5 + slamPhase * 0.4;
            rig.rightElbow.rotation.x = -0.3;
          } else {
            rig.whiteCarProp.visible = false;
            rig.carDoorProp.visible = false;
          }
        }
        break;
      }

      case 'short_circuit': {
        // "SHORT CIRCUIT" Level 1 Super (electrician):
        // Pulls two live wires from his belt and jams them into the opponent!
        if (rig.electricWiresProp) rig.electricWiresProp.visible = true;
        const startup = move.startupFrames;
        if (moveFrame < startup) {
          // Reaches down to belt with both hands to grab live wires
          const t = moveFrame / startup;
          rig.spine.rotation.x = 0.25 * t;
          rig.leftShoulder.rotation.x = 0.45 * t;
          rig.leftElbow.rotation.x = -1.6;
          rig.rightShoulder.rotation.x = 0.45 * t;
          rig.rightElbow.rotation.x = -1.6;
        } else if (moveFrame < startup + 24) {
          // Lunges forward with both arms and jams live wires into opponent with high voltage shake!
          rig.spine.rotation.x = 0.38;
          rig.leftShoulder.rotation.x = -Math.PI / 2.15;
          rig.leftShoulder.rotation.z = 0.15;
          rig.leftElbow.rotation.x = -0.12;
          rig.rightShoulder.rotation.x = -Math.PI / 2.15;
          rig.rightShoulder.rotation.z = -0.15;
          rig.rightElbow.rotation.x = -0.12;
          // Cartoon high-voltage vibrating hands & torso
          const zapShake = Math.sin(moveFrame * 5.0) * 0.12;
          rig.spine.rotation.z = zapShake;
          rig.leftWrist.rotation.x = zapShake * 1.5;
          rig.rightWrist.rotation.x = zapShake * 1.5;
        } else {
          // Retracts wires back to belt with a smirk
          const t = (move.totalFrames - moveFrame) / (move.totalFrames - startup - 24);
          rig.spine.rotation.x = 0.38 * t;
          rig.leftShoulder.rotation.x = -Math.PI / 2.15 * t;
          rig.rightShoulder.rotation.x = -Math.PI / 2.15 * t;
        }
        break;
      }

      case 'overclocked': {
        // "OVERCLOCKED" Level 2 Super (hi-tech worker):
        // Slaps a glowing computer chip onto his chest, glasses glow blue, circuit board lights up!
        if (rig.overclockChipProp) rig.overclockChipProp.visible = true;
        if (moveFrame < 8) {
          // Reaches up with right hand holding glowing chip
          rig.rightShoulder.rotation.x = -1.2;
          rig.rightShoulder.rotation.y = 0.3;
          rig.rightElbow.rotation.x = -1.8;
          rig.leftShoulder.rotation.x = -0.5;
        } else if (moveFrame <= 18) {
          // Slaps chip onto chest with force!
          rig.rightShoulder.rotation.x = -0.55;
          rig.rightShoulder.rotation.y = 0.2;
          rig.rightElbow.rotation.x = -2.1;
          rig.spine.rotation.x = -0.1;
          if (rig.circuitBoardOverlay) rig.circuitBoardOverlay.visible = true;
          if (rig.glassesGlowMesh) rig.glassesGlowMesh.visible = true;
        } else {
          // Glasses glint pose
          rig.rightShoulder.rotation.x = -1.55;
          rig.rightElbow.rotation.x = -2.1;
          if (rig.circuitBoardOverlay) rig.circuitBoardOverlay.visible = true;
          if (rig.glassesGlowMesh) rig.glassesGlowMesh.visible = true;
        }
        break;
      }

      case 'linoy_rage': {
        // "LINOY'S RAGE!" Level 3 Ultimate:
        // 1. Phone rings: "LINOY CALLING..." -> "WHERE ARE YOU?!"
        // 2. Freezes, trembles in fear, sweat drops fly, gold chain snaps
        // 3. Turns red, steam blasts from pointy ears, electric sparks around fists
        // 4. Screams "LINOY'S RAGE!!!" -> flurry of punches -> giant fiery-electric explosion
        // 5. Answers phone: "Yes my love, coming home now!" -> runs out of ring, then runs back in!
        const startup = move.startupFrames;
        if (moveFrame < startup) {
          // Phone screen popup above Moshon
          if (rig.phonePopupMesh) {
            rig.phonePopupMesh.visible = true;
            (rig.phonePopupMesh.material as THREE.MeshBasicMaterial).map =
              moveFrame < 7 ? (rig.phoneCallTexture || null) : (rig.phoneWhereTexture || null);
          }
          // Freezes and trembles in fear, chain snaps!
          const shake = Math.sin(moveFrame * 4.0) * 0.12;
          rig.spine.rotation.z = shake;
          rig.head.rotation.x = -0.25;
          rig.leftShoulder.rotation.x = 0.4;
          rig.rightShoulder.rotation.x = 0.4;
          if (rig.chainMesh) {
            rig.chainMesh.position.y = -0.8; // gold chain snaps and drops to the canvas
          }
        } else if (moveFrame < startup + 32) {
          // Turns red with steam from pointy ears, furious electric punch flurry!
          if (rig.steamEarsGroup) {
            rig.steamEarsGroup.visible = true;
            const steamScale = 1.0 + Math.sin(moveFrame * 0.8) * 0.4;
            rig.steamEarsGroup.scale.set(steamScale, steamScale, steamScale);
          }
          if (rig.linoyRageAura) {
            rig.linoyRageAura.visible = true;
            rig.linoyRageAura.rotation.y += 0.28;
          }
          const punchSpeed = moveFrame * 2.0;
          rig.leftShoulder.rotation.x = -Math.PI / 2 + Math.sin(punchSpeed) * 1.3;
          rig.leftElbow.rotation.x = -0.15;
          rig.rightShoulder.rotation.x = -Math.PI / 2 + Math.cos(punchSpeed) * 1.3;
          rig.rightElbow.rotation.x = -0.15;
          rig.leftGloveMesh.scale.set(1.9, 1.9, 1.9);
          rig.rightGloveMesh.scale.set(1.9, 1.9, 1.9);
          rig.spine.rotation.y = Math.sin(punchSpeed * 0.5) * 0.65;
        } else if (moveFrame < startup + 42) {
          // Huge fiery-electric explosion punch!
          rig.spine.rotation.y = 0.85;
          rig.rightShoulder.rotation.x = -Math.PI / 2;
          rig.rightElbow.rotation.x = -0.1;
          rig.rightGloveMesh.scale.set(2.4, 2.4, 2.4);
        } else {
          // Ending: answers the phone: "Yes my love, coming home now!" and runs out of the ring for a second, then runs back in!
          if (rig.chainMesh) rig.chainMesh.position.y = 0;
          if (rig.phone3DProp) rig.phone3DProp.visible = true;
          rig.rightShoulder.rotation.x = -1.8;
          rig.rightElbow.rotation.x = -2.2;
          rig.head.rotation.y = -0.3;
          // Running out and back in
          if (moveFrame >= startup + 44 && moveFrame <= startup + 50) {
            rig.root.position.x += f.facing * 4.5; // Runs offscreen!
          } else if (moveFrame > startup + 50 && moveFrame <= move.totalFrames) {
            rig.root.position.x = f.x; // Returns back to ring spot
          }
        }
        break;
      }

      case 'door_to_door': {
        // Matthew Level 2 Super: "DOOR-TO-DOOR SALES"
        const ds = state?.matthewDoorSuper;
        if (!ds) {
          // Fallback idle / whiff
          rig.spine.rotation.x = 0;
        } else {
          // Full cinematic performance
          if (ds.phase === 'KNOCK_1' || ds.tick < 36) {
            // Knocking on wooden door
            const knockCycle = Math.sin(ds.tick * 0.9);
            rig.rightShoulder.rotation.x = -1.35 + knockCycle * 0.35;
            rig.rightElbow.rotation.x = -1.8;
            rig.leftShoulder.rotation.x = -0.6;
            rig.spine.rotation.x = 0.15;
          } else if (ds.phase === 'SLAM_1' || ds.tick < 55) {
            // Slamming through door 1
            rig.spine.rotation.y = 0.75;
            rig.leftShoulder.rotation.x = -1.4;
            rig.rightShoulder.rotation.x = -1.4;
            rig.leftElbow.rotation.x = -0.2;
            rig.rightElbow.rotation.x = -0.2;
          } else if (ds.phase === 'KNOCK_2' || ds.tick < 96) {
            // Knocking on steel door
            const knockCycle = Math.sin(ds.tick * 1.1);
            rig.rightShoulder.rotation.x = -1.35 + knockCycle * 0.35;
            rig.rightElbow.rotation.x = -1.8;
            rig.leftShoulder.rotation.x = -0.6;
            rig.spine.rotation.x = 0.15;
          } else if (ds.phase === 'SLAM_2' || ds.tick < 115) {
            // Slamming through steel door
            rig.spine.rotation.y = 0.85;
            rig.leftShoulder.rotation.x = -1.5;
            rig.rightShoulder.rotation.x = -1.5;
            rig.leftElbow.rotation.x = -0.15;
            rig.rightElbow.rotation.x = -0.15;
          } else if (ds.phase === 'KNOCK_3' || ds.tick < 156) {
            // Knocking on armored door
            const knockCycle = Math.sin(ds.tick * 1.0);
            rig.rightShoulder.rotation.x = -1.35 + knockCycle * 0.35;
            rig.rightElbow.rotation.x = -1.8;
            rig.leftShoulder.rotation.x = -0.6;
            rig.spine.rotation.x = 0.15;
          } else if (ds.phase === 'SQUASH_3' || ds.tick < 185) {
            // Armored door toppled on opponent, Matthew stands back dusting off hands
            rig.spine.rotation.x = -0.1;
            rig.rightShoulder.rotation.x = -1.1;
            rig.leftShoulder.rotation.x = -1.1;
            rig.rightElbow.rotation.x = -1.8;
            rig.leftElbow.rotation.x = -1.8;
            const dustCycle = Math.sin(ds.tick * 0.8);
            rig.rightWrist.rotation.x = dustCycle * 0.4;
            rig.leftWrist.rotation.x = -dustCycle * 0.4;
          } else {
            // Handing receipt to flattened opponent with polite salesman bow
            rig.spine.rotation.x = 0.45;
            rig.rightShoulder.rotation.x = -0.75;
            rig.rightElbow.rotation.x = -0.35;
            rig.leftShoulder.rotation.x = 0.3;
            rig.head.rotation.x = 0.35;
          }
        }
        break;
      }

      case 'sleeping_giant': {
        // Matthew Level 3 Super: "THE SLEEPING GIANT"
        const ss = state?.matthewSleepSuper;
        if (!ss) {
          rig.spine.rotation.x = 0;
        } else {
          // Connected!
          if (ss.phase === 'YAWN_SLEEP' || ss.tick < 70) {
            if (ss.tick < 25) {
              // Yawn: arms high, head back, spine arched back
              const yProg = Math.sin((ss.tick / 25) * Math.PI);
              rig.spine.rotation.x = -0.35 * yProg;
              rig.neck.rotation.x = -0.65 * yProg;
              rig.head.rotation.x = -0.4 * yProg;
              rig.leftShoulder.rotation.x = -2.8 * yProg;
              rig.rightShoulder.rotation.x = -2.8 * yProg;
              rig.leftElbow.rotation.x = -0.4;
              rig.rightElbow.rotation.x = -0.4;
            } else {
              // Asleep standing: head droops forward limp, arms hang limp, snore chest breathing
              const snoreBreath = Math.sin(ss.tick * 0.25) * 0.08;
              rig.spine.rotation.x = 0.18 + snoreBreath;
              rig.neck.rotation.x = 0.6;
              rig.head.rotation.x = 0.45;
              rig.leftShoulder.rotation.x = 0.35;
              rig.rightShoulder.rotation.x = 0.35;
              rig.leftElbow.rotation.x = -0.15;
              rig.rightElbow.rotation.x = -0.15;
            }
          } else if (ss.phase === 'GROW_FLOAT' || (ss.tick >= 70 && ss.tick < 165)) {
            // Floating up towards shawarma while still asleep
            rig.spine.rotation.x = -0.1;
            rig.neck.rotation.x = -0.25;
            rig.head.rotation.x = -0.15;
            rig.leftShoulder.rotation.x = -1.2;
            rig.rightShoulder.rotation.x = -1.2;
            rig.leftElbow.rotation.x = -0.6;
            rig.rightElbow.rotation.x = -0.6;
            rig.leftHip.rotation.x = -0.2;
            rig.rightHip.rotation.x = -0.2;
            rig.leftKnee.rotation.x = 0.4;
            rig.rightKnee.rotation.x = 0.4;
          } else if (ss.phase === 'BELLY_FLOP' || (ss.tick >= 165 && ss.tick < 205)) {
            // In mid-air horizontal belly-flop dive!
            rig.bodyMesh.rotation.x = Math.PI / 2;
            rig.spine.rotation.x = -0.15;
            rig.neck.rotation.x = -0.5; // looking down at target
            rig.leftShoulder.rotation.x = -Math.PI * 0.92;
            rig.rightShoulder.rotation.x = -Math.PI * 0.92;
            rig.leftElbow.rotation.x = -0.1;
            rig.rightElbow.rotation.x = -0.1;
            rig.leftHip.rotation.x = 0.25;
            rig.rightHip.rotation.x = -0.25;
          } else {
            // Wake up confused: sits up, rubs eyes with right fist
            rig.bodyMesh.rotation.x = 0;
            rig.spine.rotation.x = 0.15;
            rig.rightShoulder.rotation.x = -1.6;
            rig.rightShoulder.rotation.y = 0.35;
            rig.rightElbow.rotation.x = -2.1;
            rig.leftShoulder.rotation.x = -0.3;
            rig.head.rotation.y = Math.sin(ss.tick * 0.22) * 0.35;
          }
        }
        break;
      }

      default:
        break;
    }

    const isNoseAttack = move.animType === 'the_big_lie' || move.name === 'The Big Lie' || move.animType === 'nose_poke';
    if (!isNoseAttack && (f.config.id === 'fighter_dandan' || f.config.id === 'fighter_moshon')) {
      // Turn head slightly toward the side-view camera so the expressive face and glasses/smile are clearly visible
      rig.head.rotation.y += -f.facing * 0.38;
      rig.head.rotation.z += f.facing * 0.04;
    }
  }

  private updateParticles(particles: ParticleEffect[]) {
    if (!this.particleMeshes) return;

    for (let i = 0; i < 150; i++) {
      if (i < particles.length) {
        const p = particles[i];
        const scale = (p.life / p.maxLife) * p.size;
        this.particleDummy.position.set(p.x, p.y, p.z);
        if (p.shape === 'shield') {
          // Blue shield flash on block: flattened disc/shield shape with wide burst
          this.particleDummy.scale.set(scale * 2.0, scale * 2.0, scale * 0.35);
        } else if (p.shape === 'blood') {
          // Cartoon red droplets: large and elongated along gravity
          this.particleDummy.scale.set(scale * 1.8, scale * 2.5, scale * 1.8);
        } else if (p.shape === 'tooth') {
          // Flying white tooth
          this.particleDummy.scale.set(scale * 2.2, scale * 2.8, scale * 1.6);
        } else if (p.shape === 'sweat') {
          // Bright light-blue sweat drops
          this.particleDummy.scale.set(scale * 1.4, scale * 2.0, scale * 1.4);
        } else if (p.shape === 'tear') {
          // Bright blue tears
          this.particleDummy.scale.set(scale * 1.5, scale * 2.2, scale * 1.5);
        } else if (p.shape === 'breath') {
          // Puffy cartoon breath
          this.particleDummy.scale.set(scale * 2.6, scale * 2.6, scale * 2.6);
        } else if (p.shape === 'star') {
          this.particleDummy.scale.set(scale * 1.6, scale * 1.6, scale * 0.6);
        } else {
          this.particleDummy.scale.set(scale * 1.3, scale * 1.3, scale * 1.3);
        }
        this.particleDummy.rotation.x += 0.15;
        this.particleDummy.rotation.y += 0.15;
        this.particleDummy.updateMatrix();
        this.particleMeshes.setMatrixAt(i, this.particleDummy.matrix);
        this.particleMeshes.setColorAt(i, this.tempParticleColor.setHex(p.color));
      } else {
        this.particleDummy.scale.set(0, 0, 0);
        this.particleDummy.updateMatrix();
        this.particleMeshes.setMatrixAt(i, this.particleDummy.matrix);
      }
    }
    this.particleMeshes.instanceMatrix.needsUpdate = true;
    if (this.particleMeshes.instanceColor) {
      this.particleMeshes.instanceColor.needsUpdate = true;
    }
  }

  public render(state: GameState) {
    // 1. Update 3D Character Rigs
    this.updateCharacters(state.p1, state.p2, state);

    // 2. Update Matthew Super 3D Cinematic Visuals (Doors, Shawarma, Crater, Receipt)
    this.updateMatthewCinematicVisuals(state);

    // 3. Update K.O. Animation System 3D Props & Visuals
    this.updateKoVisuals(state);

    // 4. Update 3D Visual Effects System (effects.js)
    if (this.effects) {
      this.effects.update(0.016, state, this.p1Rig, this.p2Rig);
    }
    this.updateParticles(state.particles);
    this.updateSplats(state.bloodSplats || []);

    // 5. Update Israeli Sunset Arena & Neighbors Crowd (cheering on big hits/KO)
    this.arena.update(performance.now(), state);

    // 6. Classic Side-View Camera Tracking (perpendicular to Z=0 fight axis)
    // Calculate comprehensive bounding box for both fighters including moves, props, and safe margins
    const p1 = state.p1;
    const p2 = state.p2;

    // Determine horizontal bounds including attacks/props extensions
    let p1MinX = p1.x - 0.85;
    let p1MaxX = p1.x + 0.85;
    let p2MinX = p2.x - 0.85;
    let p2MaxX = p2.x + 0.85;

    // Account for Matthew Level 2 and Level 3 Supers in camera bounds
    if (state.matthewDoorSuper && state.matthewDoorSuper.hitConnected) {
      const ds = state.matthewDoorSuper;
      const minDoorX = Math.min(ds.door1X, ds.door2X, ds.door3X) - 1.2;
      const maxDoorX = Math.max(ds.door1X, ds.door2X, ds.door3X) + 1.2;
      p1MinX = Math.min(p1MinX, minDoorX);
      p1MaxX = Math.max(p1MaxX, maxDoorX);
    }
    if (state.matthewSleepSuper && state.matthewSleepSuper.hitConnected) {
      const ss = state.matthewSleepSuper;
      p1MinX = Math.min(p1MinX, ss.craterX - 2.2);
      p1MaxX = Math.max(p1MaxX, ss.craterX + 2.2);
    }

    // Account for horizontal super / move reach extensions (e.g., nose stretch, service van, car door, lunges)
    if (p1.actionState === 'ATTACKING' && p1.currentMove) {
      if (p1.currentMove?.animType === 'the_big_lie' || p1.currentMove?.name === 'The Big Lie') {
        if (p1.facing > 0) p1MaxX = Math.max(p1MaxX, p1.x + 3.8);
        else p1MinX = Math.min(p1MinX, p1.x - 3.8);
      } else if (p1.currentMove?.animType === 'service_van' || p1.currentMove?.name === 'SERVICE CALL!' || p1.currentMove?.animType === 'excavator' || p1.currentMove?.name === 'Excavator Operator') {
        if (p1.facing > 0) p1MaxX = Math.max(p1MaxX, p1.x + 2.8);
        else p1MinX = Math.min(p1MinX, p1.x - 2.8);
      } else if (p1.currentMove?.animType === 'car_door' || p1.currentMove?.animType === 'holon_car') {
        if (p1.facing > 0) p1MaxX = Math.max(p1MaxX, p1.x + 2.5);
        else p1MinX = Math.min(p1MinX, p1.x - 2.5);
      }
    }

    if (p2.actionState === 'ATTACKING' && p2.currentMove) {
      if (p2.currentMove?.animType === 'the_big_lie' || p2.currentMove?.name === 'The Big Lie') {
        if (p2.facing > 0) p2MaxX = Math.max(p2MaxX, p2.x + 3.8);
        else p2MinX = Math.min(p2MinX, p2.x - 3.8);
      } else if (p2.currentMove?.animType === 'service_van' || p2.currentMove?.name === 'SERVICE CALL!' || p2.currentMove?.animType === 'excavator' || p2.currentMove?.name === 'Excavator Operator') {
        if (p2.facing > 0) p2MaxX = Math.max(p2MaxX, p2.x + 2.8);
        else p2MinX = Math.min(p2MinX, p2.x - 2.8);
      } else if (p2.currentMove?.animType === 'car_door' || p2.currentMove?.animType === 'holon_car') {
        if (p2.facing > 0) p2MaxX = Math.max(p2MaxX, p2.x + 2.5);
        else p2MinX = Math.min(p2MinX, p2.x - 2.5);
      }
    }

    const minAllX = Math.min(p1MinX, p2MinX);
    const maxAllX = Math.max(p1MaxX, p2MaxX);
    const midX = (minAllX + maxAllX) * 0.5;

    const lowestY = Math.min(p1.y, p2.y);
    let highestY = Math.max(p1.y, p2.y);
    if (state.matthewSleepSuper) {
      const ss = state.matthewSleepSuper;
      highestY = Math.max(highestY, ss.shawarmaY + 1.2, ss.matthewY + ss.matthewScale * 1.6);
    }
    const aspect = Math.max(0.2, this.camera.aspect);
    const isPortrait = aspect < 1.0;

    // Vertical framing: Elevated camera angle showing sky, palm trees & buildings while filling bottom with court floor
    const baseCamY = isPortrait ? 2.45 : 2.60;
    const camY = baseCamY + (lowestY + highestY) * 0.35;

    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const tanHalfFovV = Math.tan(fovRad * 0.5);

    // Required horizontal Z with safe margin:
    const marginX = isPortrait ? 1.8 : 2.5;
    const requiredHalfSpanX = (maxAllX - minAllX) * 0.5 + marginX;
    const requiredZx = requiredHalfSpanX / (tanHalfFovV * aspect);

    // Required vertical Z:
    const bottomSpanY = Math.min(lowestY, 0) - 0.4;
    const topSpanY = highestY + 2.8;
    const requiredHalfSpanY = Math.max(camY - bottomSpanY, topSpanY - camY, 1.8) + (isPortrait ? 0.9 : 0.6);
    const requiredZy = requiredHalfSpanY / tanHalfFovV;

    const minZ = isPortrait ? 9.5 : 8.8;
    const maxZ = 26.0;
    let targetZ = Math.min(maxZ, Math.max(minZ, Math.max(requiredZx, requiredZy)));

    // Camera keeps BOTH fighters in frame during supers
    const isSuperActive =
      (state.superCinematicTicks ?? 0) > 0 ||
      !!state.matthewDoorSuper ||
      !!state.matthewSleepSuper ||
      (state.p1.actionState === 'ATTACKING' && state.p1.currentMove?.isSuper) ||
      (state.p2.actionState === 'ATTACKING' && state.p2.currentMove?.isSuper);

    if (isSuperActive) {
      const superExtraMargin = isPortrait ? 1.0 : 0.8;
      const superRequiredZx = (requiredHalfSpanX + superExtraMargin) / (tanHalfFovV * aspect);
      targetZ = Math.min(maxZ, Math.max(minZ, Math.max(targetZ, superRequiredZx)));
    }

    // Check if either fighter is currently touching or outside the camera frame frustum:
    const currentHalfWidth = Math.max(0.1, this.camera.position.z * tanHalfFovV * aspect);
    const currentHalfHeight = Math.max(0.1, this.camera.position.z * tanHalfFovV);
    const leftFrustumEdge = this.camera.position.x - currentHalfWidth;
    const rightFrustumEdge = this.camera.position.x + currentHalfWidth;
    const bottomFrustumEdge = this.camera.position.y - currentHalfHeight;
    const topFrustumEdge = this.camera.position.y + currentHalfHeight;

    // Safety margin before the physical edge (15% padding from screen edge)
    const isOutsideFrame =
      minAllX <= leftFrustumEdge + 0.5 ||
      maxAllX >= rightFrustumEdge - 0.5 ||
      bottomSpanY <= bottomFrustumEdge + 0.3 ||
      topSpanY >= topFrustumEdge - 0.4 ||
      this.camera.position.z < targetZ * 0.96;

    // Screen shake
    const shakeX = state.screenShakeDirection.x;
    const shakeY = state.screenShakeDirection.y;

    // Special K.O. Camera Orbit: Slowly orbits a little around the falling fighter while keeping both in view
    if (state.koSequenceTicks && state.koSequenceTicks > 0) {
      const loser = state.koLoserIndex === 1 ? state.p1 : (state.koLoserIndex === 2 ? state.p2 : null);
      const orbitProgress = (240 - state.koSequenceTicks) / 240;
      const orbitAngle = Math.sin(orbitProgress * Math.PI * 0.75) * 0.22;
      const orbitTargetZ = Math.max(targetZ, isPortrait ? 9.5 : 8.5);
      const targetCenterX = loser ? (midX * 0.35 + loser.x * 0.65) : midX;

      this.camera.position.x += (targetCenterX + Math.sin(orbitAngle) * 2.0 + shakeX - this.camera.position.x) * 0.12;
      this.camera.position.y += (camY + shakeY - this.camera.position.y) * 0.12;
      this.camera.position.z += (orbitTargetZ * Math.cos(orbitAngle) - this.camera.position.z) * 0.12;

      const lookFocusX = loser ? (loser.x * 0.7 + midX * 0.3) : midX;
      this.camera.lookAt(lookFocusX, 1.15, 0);
    } else if (isOutsideFrame) {
      // If ANY fighter is outside the frame (or during fast dashes/knockbacks/supers), zoom out immediately!
      this.camera.position.z = Math.max(this.camera.position.z, targetZ);
      // Immediately track horizontal and vertical center to keep both fighters framed
      this.camera.position.x += (midX + shakeX - this.camera.position.x) * 0.35;
      this.camera.position.y += (camY + shakeY - this.camera.position.y) * 0.35;
      const lookTargetY = 1.35 + (lowestY + highestY) * 0.22;
      this.camera.lookAt(this.camera.position.x, lookTargetY, 0);
    } else {
      // Smooth tracking when comfortably inside the frame
      const lerpXY = 0.09;
      const lerpZ = targetZ > this.camera.position.z ? 0.25 : 0.075; // Zoom out quickly, zoom in gently
      this.camera.position.x += (midX + shakeX - this.camera.position.x) * lerpXY;
      this.camera.position.y += (camY + shakeY - this.camera.position.y) * lerpXY;
      this.camera.position.z += (targetZ - this.camera.position.z) * lerpZ;
      const lookTargetY = 1.35 + (lowestY + highestY) * 0.22;
      this.camera.lookAt(this.camera.position.x, lookTargetY, 0);
    }

    // 5. Update Flying Projectiles (e.g. duct tape)
    this.updateRenderProjectiles(state.projectiles);

    // 6. Camera Raycast Occlusion Fading:
    // Any arena object between camera and either fighter becomes 25% transparent, returning to normal when clear
    this.updateOcclusionFading(state);

    // 7. Draw frame
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Raycasts from camera to key sample points on both fighters.
   * Any arena object (posts, turnbuckles, ropes, crowd) in between becomes 25% transparent.
   */
  private updateOcclusionFading(state: GameState) {
    if (this.occludableArenaMeshes.length === 0) return;

    const camPos = this.camera.position;
    const occludedMeshes = new Set<THREE.Mesh>();

    // Test multiple key sample points for each fighter (feet, hips, chest, head)
    const sampleHeights = [0.35, 0.9, 1.45, 1.9];
    const targets: THREE.Vector3[] = [];

    sampleHeights.forEach((h) => {
      targets.push(new THREE.Vector3(state.p1.x, state.p1.y + h, 0));
      targets.push(new THREE.Vector3(state.p2.x, state.p2.y + h, 0));
    });

    const rayDir = new THREE.Vector3();
    for (const target of targets) {
      rayDir.subVectors(target, camPos);
      const dist = rayDir.length();
      if (dist < 0.001) continue;
      rayDir.normalize();

      this.raycaster.set(camPos, rayDir);
      this.raycaster.near = 0.1;
      this.raycaster.far = Math.max(0.1, dist - 0.2); // Only detect objects strictly in front of fighter

      const hits = this.raycaster.intersectObjects(this.occludableArenaMeshes, false);
      for (const hit of hits) {
        if (hit.object instanceof THREE.Mesh) {
          occludedMeshes.add(hit.object);
          if (hit.object.parent && hit.object.parent !== this.scene) {
            hit.object.parent.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                occludedMeshes.add(child);
              }
            });
          }
        }
      }
    }

    // Set 25% transparency (opacity: 0.25) when occluding, 1.0 when clear
    for (const mesh of this.occludableArenaMeshes) {
      const isOccluded = occludedMeshes.has(mesh);
      const targetOpacity = isOccluded ? 0.25 : 1.0;

      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            m.opacity = targetOpacity;
          });
        } else {
          mesh.material.opacity = targetOpacity;
        }
      }

      // Update child outline meshes if present
      mesh.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => {
              m.opacity = targetOpacity;
            });
          } else {
            child.material.opacity = targetOpacity;
          }
        }
      });
    }
  }

  private updateRenderProjectiles(projectiles?: Projectile[]) {
    const list = projectiles || [];
    const activeIds = new Set(list.map((p) => p.id));

    // Remove defunct projectile meshes
    for (const [id, mesh] of this.ductTapeMeshMap.entries()) {
      if (!activeIds.has(id)) {
        this.projectilesContainer.remove(mesh);
        this.ductTapeMeshMap.delete(id);
      }
    }

    // Add or move active duct tape projectiles
    list.forEach((p) => {
      let mesh = this.ductTapeMeshMap.get(p.id);
      if (!mesh) {
        mesh = new THREE.Group();
        const tapeMat = this.createToonMat(0x64748b);
        const cardMat = this.createToonMat(0xb45309);
        const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 14), tapeMat);
        mesh.add(outer);
        const core = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.17, 14), cardMat);
        mesh.add(core);
        this.addOutline(outer, 1.08);
        this.projectilesContainer.add(mesh);
        this.ductTapeMeshMap.set(p.id, mesh);
      }
      mesh.position.set(p.x, p.y, 0);
      mesh.rotation.z += 0.25;
      mesh.rotation.x = Math.PI / 2;
    });
  }

  public destroy() {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
