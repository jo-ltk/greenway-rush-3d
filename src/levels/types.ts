export type Vec3Tuple = [number, number, number];
export type SurfaceType = 'grass' | 'dirt' | 'road' | 'mud' | 'rock';

export interface PlatformConfig {
  min: Vec3Tuple;
  max: Vec3Tuple;
  color?: number;
  surface?: SurfaceType;
  neonBorder?: boolean;
}

export interface MovingObstacleConfig {
  id: string;
  pattern: 'oscillate_x' | 'oscillate_z' | 'rotate_y';
  center: Vec3Tuple;
  range: number;
  speed: number;
  radius: number;
  height: number;
}

export interface BoostPadConfig {
  id: string;
  position: Vec3Tuple;
  width: number;
  depth: number;
  launchImpulse: number;
}

export interface TokenConfig {
  id: string;
  position: Vec3Tuple;
}

export interface CheckpointConfig {
  id: string;
  position: Vec3Tuple;
}

export interface FinishLineConfig {
  id: string;
  position: Vec3Tuple;
}

export interface TrackData {
  id: number;
  trackName: string;
  trackTitle: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  spawnPoint: Vec3Tuple;
  spawnHeading: number; // radians, direction car faces at start
  platforms: PlatformConfig[];
  obstacles: MovingObstacleConfig[];
  boostPads: BoostPadConfig[];
  tokens: TokenConfig[];
  checkpoints: CheckpointConfig[];
  finishLine: FinishLineConfig;
  goldTime: number;   // seconds for gold medal
  silverTime: number; // seconds for silver medal
}

// ── Legacy LevelData type (used by unused platform-jumper level files) ──
// These files are not loaded at runtime but must typecheck cleanly.
export interface LevelData {
  id: number;
  sectorName: string;
  title: string;
  description: string;
  spawnPoint: Vec3Tuple;
  platforms: PlatformConfig[];
  hazards: {
    id: string;
    pattern: 'oscillate_x' | 'oscillate_z' | 'rotate_y';
    center: Vec3Tuple;
    range: number;
    speed: number;
    radius: number;
    height: number;
  }[];
  bouncePads: {
    id: string;
    position: Vec3Tuple;
    width: number;
    depth: number;
    launchImpulse: number;
  }[];
  crystals: { id: string; position: Vec3Tuple }[];
  checkpoints: CheckpointConfig[];
  goal: { id: string; position: Vec3Tuple };
}
