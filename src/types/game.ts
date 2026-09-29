export type MoveType = 'LIGHT_PUNCH' | 'HEAVY_PUNCH' | 'LIGHT_KICK' | 'HEAVY_KICK' | 'SUPER_MOVE';

export type ActionState =
  | 'IDLE'
  | 'WALK_FORWARD'
  | 'WALK_BACK'
  | 'DASH_FORWARD'
  | 'DASH_BACK'
  | 'JUMP_START'
  | 'JUMPING'
  | 'CROUCH'
  | 'BLOCKING'
  | 'ATTACKING'
  | 'HITSTUN'
  | 'BLOCKSTUN'
  | 'KNOCKDOWN'
  | 'VICTORY'
  | 'DEFEAT';

export type AttackLevel = 'high' | 'mid' | 'low';

export interface MoveHitbox {
  startFrame: number;
  duration: number;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
  damage: number;
  knockbackX: number;
  knockbackY: number;
  hitstun: number;
  blockstun: number;
  isHeavy: boolean;
  humorText: string;
  soundType: 'light' | 'heavy' | 'super' | 'bonk';
  attackLevel?: AttackLevel;
}

export type MoveAnimType =
  | 'lp'
  | 'hp'
  | 'lk'
  | 'hk'
  | 'super'
  | 'nose_poke'
  | 'drill'
  | 'fake_ko'
  | 'wrench_uppercut'
  | 'rocket_dive'
  | 'wrench_swing'
  | 'wrench_launcher'
  | 'excavator'
  | 'service_van'
  | 'car_door'
  | 'holon_car'
  | 'short_circuit'
  | 'overclocked'
  | 'linoy_rage'
  | 'the_big_lie'
  | 'the_eliminator'
  | 'belly_bounce'
  | 'door_shield'
  | 'snack_break'
  | 'snore_wave'
  | 'do_the_math'
  | 'door_to_door'
  | 'sleeping_giant'
  | 'hammer_smash'
  | 'stomp'
  | 'belly_bump';

export interface MoveDefinition {
  name: string;
  type: MoveType;
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  totalFrames: number;
  damage: number;
  meterGain: number;
  superCost?: number;
  hitboxes: MoveHitbox[];
  isSuper?: boolean;
  isHeavy?: boolean;
  animType: MoveAnimType;
  attackLevel?: AttackLevel;
}

export type MotionCommand = 'QCF' | 'QCB' | 'DOUBLE_TAP_F' | 'BACK_FORWARD' | 'DOWN_DOWN' | 'DOWN_BACK_FORWARD';
export type AttackButton = 'LP' | 'HP' | 'LK' | 'HK' | 'SUPER';

export interface SpecialMoveDefinition {
  id: string;
  name: string;
  command: MotionCommand;
  button: AttackButton;
  commandDisplay: string;
  description: string;
  move: MoveDefinition;
}

export interface SuperMoveDefinition extends SpecialMoveDefinition {
  level: 1 | 2 | 3;
  meterCost: number;
}

export interface ComboDefinition {
  id: string;
  name: string;
  fromMoveName: string;
  nextButton: AttackButton;
  nextMove: MoveDefinition;
  displayChain: string;
}

export interface Projectile {
  id: string;
  ownerIndex: 1 | 2;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'duct_tape' | 'snore_zzz';
  damage: number;
  life: number;
}

export type BodyType = 'slim' | 'average' | 'heavy' | 'tall' | 'bulky';
export type HeadShape = 'round' | 'square' | 'chiseled' | 'oval';
export type EyebrowStyle = 'thick' | 'angry' | 'normal' | 'arched';
export type MouthType = 'smile' | 'serious' | 'grin' | 'open';
export type NoseShape = 'button' | 'hook' | 'broad' | 'pointy';
export type NoseSize = 'small' | 'medium' | 'large';
export type HairStyle = 'bald' | 'short' | 'faux-hawk' | 'long' | 'curly' | 'spiky' | 'headband' | 'afro';
export type BeardStyle = 'none' | 'stubble' | 'goatee' | 'full';
export type ShirtType = 'bare_chest' | 'tank_top' | 'tshirt' | 'gi' | 'vest';
export type PantsType = 'shorts' | 'long_pants' | 'gi_pants' | 'tights';
export type ShoesType = 'boxing_boots' | 'sneakers' | 'barefoot' | 'martial_wraps';
export type GloveType = 'boxing_gloves' | 'hand_wraps' | 'mma_gloves' | 'bare_hands' | 'work_gloves';
export type AccessorySlot = 'none' | 'hat' | 'glasses' | 'tool_belt' | 'chain' | 'headband' | 'boxing_belt' | 'black_belt';

export interface FighterAppearance {
  primaryColor: number;
  secondaryColor: number;
  skinColor: number;
  gloveColor: number;
  hairColor: number;
  eyeColor?: number;
  graphicColor?: number;
  cuffColor?: number;
  bodyType: BodyType;
  headShape?: HeadShape;
  faceType?: 'square' | 'round'; // backward compat
  eyebrows?: EyebrowStyle;
  mouth?: MouthType;
  noseShape?: NoseShape;
  noseSize?: NoseSize;
  hairStyle: HairStyle;
  beard?: BeardStyle;
  shirtType?: ShirtType;
  shirtColor?: number;
  pantsType?: PantsType;
  pantsColor?: number;
  shoesType?: ShoesType;
  shoesColor?: number;
  gloveType?: GloveType;
  accessory?: AccessorySlot;
  specialItem?: 'boxing_belt' | 'black_belt'; // backward compat
}

export interface FighterStats {
  maxHealth: number;
  walkSpeed: number;
  dashSpeed: number;
  jumpForce: number;
  powerMultiplier: number;
  weight: number;
}

export interface FighterConfig {
  id: string;
  name: string;
  subtitle: string;
  stats: FighterStats;
  appearance: FighterAppearance;
  moves: Record<MoveType, MoveDefinition>;
  specials?: SpecialMoveDefinition[];
  combos?: ComboDefinition[];
  superSpecial?: SpecialMoveDefinition;
  supers?: SuperMoveDefinition[];
  victoryQuote: string;
  defeatQuote: string;
  koAnimation?: {
    type: 'dandan_dart' | 'moshon_phone' | 'matthew_timber' | 'default_stars';
    quote?: string;
  };
}

export interface FighterState {
  id: string;
  playerIndex: 1 | 2;
  config: FighterConfig;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  facing: 1 | -1; // 1 = facing right, -1 = facing left
  health: number;
  maxHealth: number;
  displayHealth: number; // for yellow trailing health bar
  superMeter: number;
  maxSuperMeter: number;
  actionState: ActionState;
  currentMove: MoveDefinition | null;
  moveFrame: number;
  hitstunFrames: number;
  blockstunFrames: number;
  isBlocking: boolean;
  isCrouching: boolean;
  isGrounded: boolean;
  hasHitThisMove: boolean;
  hasShownPopUpThisMove?: boolean;
  lastHitboxIndex?: number;
  comboCount: number;
  roundsWon: number;
  eyePop: number; // 0 to 1 for cartoon eye bulging
  wobbleAngle: number;
  koTumble: number;
  isKo: boolean;
  slowDebuffTicks?: number; // slowed by duct tape
  counterStanceTicks?: number; // "It Wasn't Me!" fake-out counter window
  glassesGlintBuff?: boolean; // Moshon's double damage on next attack
  earRadarTicks?: number; // Moshon's auto-counter window
  overclockedTicks?: number; // Moshon Level 2 Overclocked buff (6 seconds = 360 ticks)
  overclockedHitCount?: number; // Moshon Overclocked hit counter (5 hits -> fatal error freeze)
  fatalErrorTicks?: number; // Opponent frozen in blue FATAL ERROR screen (1.5s = 90 ticks)
  shockedTicks?: number; // Opponent shocked with cartoon x-ray skeleton & smoke (Level 1 Short Circuit)
  superMeterHoldTicks?: number; // for holding super button
  isUltimateSuperActive?: boolean;
  juggleCount?: number; // Max 3 airborne hits limit
  wakeupTicks?: number; // Getting up countdown after knockdown (60 ticks = 1 sec)
  quickRollTicks?: number; // Quick roll back to get up faster
  invincibleTicks?: number; // Post-wakeup invincibility (30 ticks = 0.5 sec)
  throwGrabbedTicks?: number; // 300ms (18 ticks) break window
  throwAttackerIndex?: number; // Who grabbed this fighter
  throwCooldownTicks?: number; // Cooldown between throw attempts
  headSquashTimer?: number; // Face squash duration on heavy hits
  headSquashDirection?: number; // Hit direction for face squash
  dazedTicks?: number; // Circling stars over head after knockdown
  pancakeTicks?: number; // Flattened like a pancake after being run over by Dandan's service van
}

export interface InputFrame {
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
  throw?: boolean;
  specialMoveIndex?: number;
  superLevel?: 1 | 2 | 3;
  dashForward: boolean;
  dashBack: boolean;
}

export interface InputSource {
  poll(state: GameState, playerIndex: 1 | 2): InputFrame;
  reset?(): void;
}

export interface FloatingEffect {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  rotation: number;
}

export interface BloodSplat {
  x: number;
  z: number;
  scale: number;
  rotation: number;
  life: number;
  maxLife: number;
}

export interface ParticleEffect {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: number;
  size: number;
  life: number;
  maxLife: number;
  shape: 'star' | 'sweat' | 'spark' | 'heart' | 'shield' | 'blood' | 'tear' | 'breath' | 'tooth';
}

export type StagePhase = 'COUNTDOWN' | 'FIGHTING' | 'ROUND_END' | 'MATCH_END' | 'PAUSED';

export interface GameState {
  tick: number;
  roundTimeRemaining: number;
  roundTimerTicks: number;
  roundNumber: number;
  matchMaxRounds: number; // usually 3 (best of 3 = first to 2)
  targetWins: number;
  roundWinner: 1 | 2 | 'DRAW' | null;
  matchWinner: 1 | 2 | null;
  stagePhase: StagePhase;
  announcementText: string;
  announcementSubtext: string;
  announcementTimer: number;
  hitStopTicks: number;
  slowMoFactor: number;
  slowMoTicks: number;
  screenShake: number;
  screenShakeDirection: { x: number; y: number };
  p1: FighterState;
  p2: FighterState;
  floatingTexts: FloatingEffect[];
  particles: ParticleEffect[];
  bloodSplats?: BloodSplat[];
  projectiles?: Projectile[];
  stageWidth: number;
  superCinematicTicks?: number;
  superTitleTicks?: number;
  superTitle?: string;
  superAttackerIndex?: 1 | 2 | null;
  superType?: 'standard' | 'ultimate';
  matthewDoorSuper?: MatthewDoorToDoorState | null;
  matthewSleepSuper?: MatthewSleepingGiantState | null;
  koSequenceTicks?: number;
  koLandedGround?: boolean;
  koOrbitTicks?: number;
  whiteFlashTicks?: number;
  koLoserIndex?: 1 | 2 | null;
  koWinnerIndex?: 1 | 2 | null;
}

export interface MatthewDoorToDoorState {
  attackerIndex: 1 | 2;
  defenderIndex: 1 | 2;
  tick: number; // 0 to max 240
  elapsedSec?: number;
  phase: 'STARTUP' | 'WHIFF' | 'KNOCK_1' | 'SLAM_1' | 'KNOCK_2' | 'SLAM_2' | 'KNOCK_3' | 'SQUASH_3' | 'RECEIPT' | 'DONE';
  hitConnected: boolean;
  damageApplied: boolean;
  door1Visible?: boolean;
  door2Visible?: boolean;
  door3Visible?: boolean;
  door1Broken: boolean;
  door2Broken: boolean;
  door3Fallen: boolean;
  receiptGiven: boolean;
  door1X: number;
  door2X: number;
  door3X: number;
}

export interface MatthewSleepingGiantState {
  attackerIndex: 1 | 2;
  defenderIndex: 1 | 2;
  tick: number; // 0 to max 300
  elapsedSec?: number;
  phase: 'STARTUP' | 'WHIFF' | 'YAWN_SLEEP' | 'GROW_FLOAT' | 'BELLY_FLOP' | 'CRATER_PANIC' | 'WAKE_CONFUSED' | 'DONE';
  hitConnected: boolean;
  damageApplied: boolean;
  matthewScale: number; // 1.0 to 3.0
  matthewY: number;
  craterVisible: boolean;
  craterX: number;
  shawarmaVisible: boolean;
  shawarmaY: number;
  crowdAsleep: boolean;
}
