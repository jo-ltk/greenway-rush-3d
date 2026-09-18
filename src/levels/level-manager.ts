import * as THREE from 'three';
import type { TrackData } from './types.ts';
import { TRACK_1 } from './track-1.ts';
import { TRACK_2 } from './track-2.ts';
import { TRACK_3 } from './track-3.ts';
import type {
  AABBCollider,
  MovingHazardCollider,
  BoostPadCollider,
  CrystalCollider,
  CheckpointCollider,
  GoalCollider,
} from '../physics/collider.ts';

interface ActiveObstacle {
  config: TrackData['obstacles'][number];
  mesh: THREE.Group;
  collider: MovingHazardCollider;
}

interface ActiveToken {
  id: string;
  mesh: THREE.Group;
  baseY: number;
  collider: CrystalCollider;
}

interface ActiveCheckpoint {
  id: string;
  mesh: THREE.Group;
  collider: CheckpointCollider;
}

interface ActiveFinish {
  mesh: THREE.Group;
  collider: GoalCollider;
}

// ─────────────────────────────────────────────────────────────────────────────
// Procedural asphalt texture (canvas-based, no external files needed)
// ─────────────────────────────────────────────────────────────────────────────
function createAsphaltTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // --- Base asphalt colour (dark grey) ---
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, size, size);

  // --- Aggregate speckle (lighter grey pebbles) ---
  const rng = seededRngFn(42);
  for (let i = 0; i < 2800; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 1.2 + rng() * 3.5;
    const brightness = Math.floor(55 + rng() * 60);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
    ctx.fill();
  }

  // --- Subtle tyre-track lanes (darker longitudinal bands) ---
  // Left tyre track
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(size * 0.22, 0, size * 0.14, size);
  // Right tyre track
  ctx.fillRect(size * 0.64, 0, size * 0.14, size);

  // --- Faint centre-line ghost (worn paint) ---
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = size * 0.018;
  ctx.setLineDash([size * 0.12, size * 0.08]);
  ctx.beginPath();
  ctx.moveTo(size * 0.5, 0);
  ctx.lineTo(size * 0.5, size);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- Edge dirt accumulation (brown tint fading inward) ---
  const edgeGrad = ctx.createLinearGradient(0, 0, size * 0.18, 0);
  edgeGrad.addColorStop(0,   'rgba(100,70,30,0.45)');
  edgeGrad.addColorStop(1,   'rgba(100,70,30,0.0)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(0, 0, size * 0.18, size);

  const edgeGradR = ctx.createLinearGradient(size, 0, size * 0.82, 0);
  edgeGradR.addColorStop(0,  'rgba(100,70,30,0.45)');
  edgeGradR.addColorStop(1,  'rgba(100,70,30,0.0)');
  ctx.fillStyle = edgeGradR;
  ctx.fillRect(size * 0.82, 0, size * 0.18, size);

  // --- Fine noise pass (micro surface variation) ---
  for (let i = 0; i < 900; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const alpha = 0.04 + rng() * 0.08;
    const dark = rng() > 0.5;
    ctx.fillStyle = dark ? `rgba(0,0,0,${alpha})` : `rgba(200,200,200,${alpha})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  // Repeat: 1 tile per ~4 world units in X, 1 per ~6 world units in Z
  tex.repeat.set(2, 28);
  tex.anisotropy = 4;
  return tex;
}

function createDirtTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const rng = seededRngFn(77);

  // Base warm dirt colour
  ctx.fillStyle = '#b08040';
  ctx.fillRect(0, 0, size, size);

  // Soil variation blobs
  for (let i = 0; i < 600; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 2 + rng() * 7;
    const light = rng() > 0.5;
    const c = light ? `rgba(200,160,80,0.3)` : `rgba(80,50,20,0.25)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  }

  // Small pebbles
  for (let i = 0; i < 200; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 1 + rng() * 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(140,120,80,0.6)`;
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 28);
  tex.anisotropy = 2;
  return tex;
}

/** Tiny seeded RNG (LCG) — used in texture generators */
function seededRngFn(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: create a tree at (x, z)
// ─────────────────────────────────────────────────────────────────────────────
function makeTree(x: number, y: number, z: number, scale = 1.0): THREE.Group {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x7a4f2c, roughness: 0.9 });
  const leafMat  = new THREE.MeshStandardMaterial({ color: 0x2d7a2e, roughness: 0.85 });
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x388e3c, roughness: 0.85 });

  const trunkH = 1.0 * scale;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, trunkH, 8), trunkMat);
  trunk.position.y = trunkH * 0.5;
  trunk.castShadow = true;
  g.add(trunk);

  for (let i = 0; i < 3; i++) {
    const h = (1.2 - i * 0.25) * scale;
    const r = (0.72 - i * 0.08) * scale;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), i % 2 === 0 ? leafMat : leafMat2);
    cone.position.y = trunkH + i * 0.5 * scale;
    cone.castShadow = true;
    g.add(cone);
  }

  g.position.set(x, y, z);
  return g;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: create a bush
// ─────────────────────────────────────────────────────────────────────────────
function makeBush(x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const mat  = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.9 });
  const mat2 = new THREE.MeshStandardMaterial({ color: 0x81c784, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const r = 0.28 + Math.random() * 0.14;
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 7, 6), i % 2 === 0 ? mat : mat2);
    s.position.set((i - 1) * 0.22, r * 0.6, 0);
    s.castShadow = true;
    g.add(s);
  }
  g.position.set(x, y, z);
  return g;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: create a flower cluster
// ─────────────────────────────────────────────────────────────────────────────
function makeFlower(x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group();
  const stemMat  = new THREE.MeshStandardMaterial({ color: 0x558b2f, roughness: 0.9 });
  const petalColors = [0xffeb3b, 0xff9800, 0xfff176, 0xff7043];
  for (let i = 0; i < 3; i++) {
    const stemH = 0.22 + Math.random() * 0.1;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, stemH, 5), stemMat);
    stem.position.set((i - 1) * 0.18, stemH * 0.5, 0);
    g.add(stem);
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 5),
      new THREE.MeshStandardMaterial({ color: petalColors[i % petalColors.length], roughness: 0.8 })
    );
    petal.position.set((i - 1) * 0.18, stemH, 0);
    g.add(petal);
  }
  g.position.set(x, y, z);
  return g;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get platform material
// ─────────────────────────────────────────────────────────────────────────────
function makeSurfaceMaterial(
  surface: string | undefined,
  color: number | undefined,
  asphaltTex: THREE.CanvasTexture,
  dirtTex: THREE.CanvasTexture
): THREE.MeshStandardMaterial {
  if (color !== undefined) {
    // Explicit color (guardrails etc.)
    return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.0 });
  }

  switch (surface) {
    case 'road':
      return new THREE.MeshStandardMaterial({
        map: asphaltTex,
        color: 0xffffff,      // let texture drive the colour
        roughness: 0.88,
        metalness: 0.0,
        roughnessMap: asphaltTex,
      });

    case 'dirt':
      return new THREE.MeshStandardMaterial({
        map: dirtTex,
        color: 0xffffff,
        roughness: 0.95,
        metalness: 0.0,
      });

    case 'mud':
      return new THREE.MeshStandardMaterial({ color: 0x8d6e41, roughness: 0.98, metalness: 0.0 });

    case 'rock':
      return new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.85, metalness: 0.0 });

    case 'grass':
    default:
      return new THREE.MeshStandardMaterial({ color: 0x6abf69, roughness: 0.90, metalness: 0.0 });
  }
}

export class LevelManager {
  public group: THREE.Group;
  public currentTrackData: TrackData | null = null;
  public currentLevelIndex: number = 0;

  // Collision arrays (runtime.ts reads these)
  public boxes: AABBCollider[] = [];
  public hazards: MovingHazardCollider[] = [];
  public boostPads: BoostPadCollider[] = [];
  public crystals: CrystalCollider[] = [];
  public checkpoints: CheckpointCollider[] = [];
  public goal: GoalCollider | null = null;

  // Visual instances
  private activeObstacles: ActiveObstacle[] = [];
  private activeTokens: ActiveToken[] = [];
  private activeCheckpoints: ActiveCheckpoint[] = [];
  private activeFinish: ActiveFinish | null = null;
  private boostPadMeshes: THREE.Mesh[] = [];

  private tracks: TrackData[] = [TRACK_1, TRACK_2, TRACK_3];

  // Shared textures (created once, reused across loads)
  private asphaltTex: THREE.CanvasTexture;
  private dirtTex: THREE.CanvasTexture;

  constructor() {
    this.group = new THREE.Group();
    this.asphaltTex = createAsphaltTexture();
    this.dirtTex    = createDirtTexture();
  }

  public get totalLevels(): number {
    return this.tracks.length;
  }

  public loadLevel(levelIndex: number): TrackData {
    this.clear();
    const safeIndex = Math.max(0, Math.min(this.tracks.length - 1, levelIndex));
    this.currentLevelIndex = safeIndex;
    const data = this.tracks[safeIndex];
    this.currentTrackData = data;

    // ── 1. Ground Plane (large green grass base) ─────────────────
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x5eb965,
      roughness: 0.9,
      metalness: 0.0,
    });
    const groundGeom = new THREE.PlaneGeometry(400, 400);
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.51, 90);   // just below road bottom so it doesn't z-fight
    ground.receiveShadow = true;
    this.group.add(ground);

    // ── 2. Platforms / Track Sections ────────────────────────────
    for (const p of data.platforms) {
      const min = new THREE.Vector3(...p.min);
      const max = new THREE.Vector3(...p.max);
      const size = max.clone().sub(min);
      const center = min.clone().add(max).multiplyScalar(0.5);

      const mat = makeSurfaceMaterial(p.surface, p.color, this.asphaltTex, this.dirtTex);
      const geom = new THREE.BoxGeometry(size.x, size.y, size.z);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(center);
      mesh.receiveShadow = true;
      mesh.castShadow = false;  // road slabs don't need to cast
      this.group.add(mesh);

      // Thin white edge-line strips on road surface top
      if (p.surface === 'road' && !p.color) {
        this.addRoadEdgeLines(min, max);
      }

      // Collision box for this platform
      this.boxes.push({
        type: 'box',
        id: `plat_${this.boxes.length}`,
        min,
        max,
        restitution: 0.08,
        friction: p.surface === 'mud' ? 0.9 : p.surface === 'grass' ? 0.7 : 0.50,
      });
    }

    // ── 3. Boost Pads ─────────────────────────────────────────────
    const boostArrowMat = new THREE.MeshStandardMaterial({
      color: 0xff6b00,
      emissive: 0xff8c00,
      emissiveIntensity: 0.5,
      roughness: 0.4,
    });
    const boostBaseMat = new THREE.MeshStandardMaterial({
      color: 0xffd54f,
      roughness: 0.5,
    });

    for (const bp of data.boostPads) {
      const pos = new THREE.Vector3(...bp.position);

      const baseGeom = new THREE.BoxGeometry(bp.width, 0.08, bp.depth);
      const baseMesh = new THREE.Mesh(baseGeom, boostBaseMat);
      baseMesh.position.copy(pos);
      baseMesh.receiveShadow = true;
      this.group.add(baseMesh);
      this.boostPadMeshes.push(baseMesh);

      const arrowGeom = new THREE.ConeGeometry(0.5, 1.0, 3);
      arrowGeom.rotateX(Math.PI / 2);
      const arrow = new THREE.Mesh(arrowGeom, boostArrowMat);
      arrow.position.copy(pos);
      arrow.position.y += 0.12;
      this.group.add(arrow);

      this.boostPads.push({
        type: 'bounce_pad',
        id: bp.id,
        position: pos,
        width: bp.width,
        depth: bp.depth,
        launchImpulse: bp.launchImpulse,
      });
    }

    // ── 4. Moving Obstacles ───────────────────────────────────────
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x795548, roughness: 0.9 });
    for (const obs of data.obstacles) {
      const oGroup = new THREE.Group();
      const geom = new THREE.DodecahedronGeometry(obs.radius, 0);
      const mesh = new THREE.Mesh(geom, rockMat);
      mesh.castShadow = true;
      oGroup.add(mesh);

      const centerPos = new THREE.Vector3(...obs.center);
      oGroup.position.copy(centerPos);
      this.group.add(oGroup);

      const col: MovingHazardCollider = {
        type: 'hazard',
        id: obs.id,
        position: centerPos.clone(),
        radius: obs.radius,
        height: obs.height,
        damage: 1,
      };

      this.hazards.push(col);
      this.activeObstacles.push({ config: obs, mesh: oGroup, collider: col });
    }

    // ── 5. Token Coins (collectibles) ─────────────────────────────
    const tokenMat = new THREE.MeshStandardMaterial({
      color: 0xffd740,
      emissive: 0xffab00,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.6,
    });

    for (const tk of data.tokens) {
      const tGroup = new THREE.Group();
      const geom = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 16);
      const mesh = new THREE.Mesh(geom, tokenMat);
      mesh.castShadow = true;
      tGroup.add(mesh);

      const starMat   = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
      const innerGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.09, 5);
      const inner     = new THREE.Mesh(innerGeom, starMat);
      tGroup.add(inner);

      const pos = new THREE.Vector3(...tk.position);
      tGroup.position.copy(pos);
      this.group.add(tGroup);

      const col: CrystalCollider = {
        type: 'crystal',
        id: tk.id,
        position: pos.clone(),
        radius: 0.35,
        collected: false,
      };

      this.crystals.push(col);
      this.activeTokens.push({ id: tk.id, mesh: tGroup, baseY: pos.y, collider: col });
    }

    // ── 6. Checkpoints (wooden arch) ──────────────────────────────
    const checkpointWoodMat  = new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.85 });
    const checkpointFlagMat  = new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.7 });
    const checkpointFlagMat2 = new THREE.MeshStandardMaterial({ color: 0xfdd835, roughness: 0.7 });

    for (const cp of data.checkpoints) {
      const cpGroup = new THREE.Group();
      const pos = new THREE.Vector3(...cp.position);
      cpGroup.position.copy(pos);

      const postGeom = new THREE.CylinderGeometry(0.12, 0.14, 2.8, 7);
      const post1 = new THREE.Mesh(postGeom, checkpointWoodMat);
      post1.position.set(-1.6, 1.4, 0);
      post1.castShadow = true;
      cpGroup.add(post1);

      const post2 = new THREE.Mesh(postGeom, checkpointWoodMat);
      post2.position.set(1.6, 1.4, 0);
      post2.castShadow = true;
      cpGroup.add(post2);

      const barGeom = new THREE.CylinderGeometry(0.08, 0.08, 3.4, 6);
      const bar = new THREE.Mesh(barGeom, checkpointWoodMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, 2.8, 0);
      cpGroup.add(bar);

      for (let i = 0; i < 4; i++) {
        const flagGeom = new THREE.BoxGeometry(0.7, 0.2, 0.04);
        const flag = new THREE.Mesh(flagGeom, i % 2 === 0 ? checkpointFlagMat : checkpointFlagMat2);
        flag.position.set(-1.05 + i * 0.7, 2.8, 0.06);
        cpGroup.add(flag);
      }

      this.group.add(cpGroup);
      this.activeCheckpoints.push({
        id: cp.id,
        mesh: cpGroup,
        collider: {
          type: 'checkpoint',
          id: cp.id,
          position: pos.clone(),
          radius: 2.0,
          activated: false,
        },
      });
      this.checkpoints.push(this.activeCheckpoints[this.activeCheckpoints.length - 1].collider);
    }

    // ── 7. Finish Line ────────────────────────────────────────────
    const finishPos   = new THREE.Vector3(...data.finishLine.position);
    const finishGroup = new THREE.Group();
    finishGroup.position.copy(finishPos);

    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });

    const finPostGeom = new THREE.CylinderGeometry(0.18, 0.2, 3.5, 8);
    const fp1 = new THREE.Mesh(finPostGeom, whiteMat);
    fp1.position.set(-3.0, 1.75, 0);
    fp1.castShadow = true;
    finishGroup.add(fp1);
    const fp2 = new THREE.Mesh(finPostGeom, whiteMat);
    fp2.position.set(3.0, 1.75, 0);
    fp2.castShadow = true;
    finishGroup.add(fp2);

    const barW  = 6.4;
    const checks = 8;
    for (let i = 0; i < checks; i++) {
      const checkGeom = new THREE.BoxGeometry(barW / checks, 0.4, 0.3);
      const checkMesh = new THREE.Mesh(checkGeom, i % 2 === 0 ? whiteMat : blackMat);
      checkMesh.position.set(-barW / 2 + (i + 0.5) * (barW / checks), 3.5, 0);
      finishGroup.add(checkMesh);
    }

    for (let side = -1; side <= 1; side += 2) {
      const flagStick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.8, 5),
        whiteMat
      );
      flagStick.position.set(side * 3.0, 4.2, 0);
      finishGroup.add(flagStick);
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.32),
        new THREE.MeshStandardMaterial({
          color: side > 0 ? 0x43a047 : 0xfdd835,
          roughness: 0.7,
          side: THREE.DoubleSide,
        })
      );
      flag.position.set(side * 3.24, 4.35, 0);
      finishGroup.add(flag);
    }

    this.group.add(finishGroup);
    this.goal = {
      type: 'goal',
      id: data.finishLine.id,
      position: finishPos.clone(),
      radius: 3.2,
    };
    this.activeFinish = { mesh: finishGroup, collider: this.goal };

    // ── 8. Environment Decoration ─────────────────────────────────
    this.addEnvironmentDecoration(data);

    return data;
  }

  /** White edge-line strips along the road surface */
  private addRoadEdgeLines(min: THREE.Vector3, max: THREE.Vector3): void {
    const roadTop = max.y + 0.005;
    const roadLen = max.z - min.z;
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.6,
      metalness: 0.0,
    });
    const lineW = 0.12;

    // Left edge line
    const leftGeom = new THREE.BoxGeometry(lineW, 0.01, roadLen);
    const leftLine = new THREE.Mesh(leftGeom, lineMat);
    leftLine.position.set(min.x + lineW * 0.5 + 0.1, roadTop, (min.z + max.z) * 0.5);
    this.group.add(leftLine);

    // Right edge line
    const rightGeom = new THREE.BoxGeometry(lineW, 0.01, roadLen);
    const rightLine = new THREE.Mesh(rightGeom, lineMat);
    rightLine.position.set(max.x - lineW * 0.5 - 0.1, roadTop, (min.z + max.z) * 0.5);
    this.group.add(rightLine);
  }

  private addEnvironmentDecoration(data: TrackData): void {
    const rng = this.seededRng(data.id * 137);

    // Fixed trees near start area
    const treePositions: [number, number][] = [
      [-8, 5], [-8, 15], [-8, 25], [-8, 35],
      [ 8, 5], [ 8, 15], [ 8, 25], [ 8, 35],
      [-15, 50], [-15, 65], [-20, 80], [10, 50], [15, 65], [18, 80],
    ];
    for (const [tx, tz] of treePositions) {
      const scale = 0.8 + rng() * 0.6;
      this.group.add(makeTree(tx, -0.5, tz, scale));
    }

    // Randomised trees further out
    const trackLength = 200;
    for (let i = 0; i < 40; i++) {
      const side = rng() > 0.5 ? 1 : -1;
      const x    = side * (14 + rng() * 20);
      const z    = rng() * trackLength;
      this.group.add(makeTree(x, -0.5, z, 0.7 + rng() * 0.8));
    }

    // Bushes
    for (let i = 0; i < 30; i++) {
      const side = rng() > 0.5 ? 1 : -1;
      const x    = side * (8 + rng() * 16);
      const z    = rng() * trackLength;
      this.group.add(makeBush(x, -0.5, z));
    }

    // Flower clusters
    for (let i = 0; i < 35; i++) {
      const side = rng() > 0.5 ? 1 : -1;
      const x    = side * (6 + rng() * 20);
      const z    = rng() * trackLength;
      this.group.add(makeFlower(x, -0.5, z));
    }

    // Small rocks
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.9 });
    for (let i = 0; i < 20; i++) {
      const side = rng() > 0.5 ? 1 : -1;
      const x    = side * (10 + rng() * 14);
      const z    = rng() * trackLength;
      const r    = 0.15 + rng() * 0.25;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockMat);
      rock.position.set(x, -0.5 + r * 0.5, z);
      rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      rock.castShadow = true;
      this.group.add(rock);
    }
  }

  private seededRng(seed: number): () => number {
    return seededRngFn(seed);
  }

  public update(time: number): void {
    // 1. Animate obstacles
    for (const obs of this.activeObstacles) {
      const cfg = obs.config;
      const c   = cfg.center;
      if (cfg.pattern === 'oscillate_x') {
        const offset = Math.sin(time * cfg.speed) * cfg.range;
        obs.mesh.position.x     = c[0] + offset;
        obs.collider.position.x = c[0] + offset;
      } else if (cfg.pattern === 'oscillate_z') {
        const offset = Math.sin(time * cfg.speed) * cfg.range;
        obs.mesh.position.z     = c[2] + offset;
        obs.collider.position.z = c[2] + offset;
      } else if (cfg.pattern === 'rotate_y') {
        const angle = time * cfg.speed;
        obs.mesh.position.x     = c[0] + Math.cos(angle) * cfg.range;
        obs.mesh.position.z     = c[2] + Math.sin(angle) * cfg.range;
        obs.collider.position.x = obs.mesh.position.x;
        obs.collider.position.z = obs.mesh.position.z;
      }
      obs.mesh.rotation.y = time * 0.8;
    }

    // 2. Animate tokens (spin and float)
    for (const tk of this.activeTokens) {
      if (tk.collider.collected) {
        tk.mesh.visible = false;
        continue;
      }
      tk.mesh.visible     = true;
      tk.mesh.rotation.y  = time * 2.5;
      tk.mesh.position.y  = tk.baseY + Math.sin(time * 3.0 + tk.id.charCodeAt(tk.id.length - 1)) * 0.12;
      tk.collider.position.y = tk.mesh.position.y;
    }

    // 3. Checkpoint activation visual
    for (const cp of this.activeCheckpoints) {
      if (cp.collider.activated) {
        cp.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat.color && mat.color.getHex() === 0x43a047) {
              mat.emissive          = new THREE.Color(0x2e7d32);
              mat.emissiveIntensity = 0.5;
            }
          }
        });
      }
    }

    // 4. Pulse boost pads
    for (let i = 0; i < this.boostPadMeshes.length; i++) {
      const mesh  = this.boostPadMeshes[i];
      const scale = 1.0 + Math.sin(time * 4.0 + i) * 0.03;
      mesh.scale.set(scale, 1.0, scale);
    }

    // 5. Animate finish line flags
    if (this.activeFinish) {
      this.activeFinish.mesh.rotation.y = Math.sin(time * 1.5) * 0.04;
    }
  }

  public clear(): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if ((child as THREE.Mesh).geometry) {
        (child as THREE.Mesh).geometry.dispose();
      }
    }

    this.boxes       = [];
    this.hazards     = [];
    this.boostPads   = [];
    this.crystals    = [];
    this.checkpoints = [];
    this.goal        = null;

    this.activeObstacles  = [];
    this.activeTokens     = [];
    this.activeCheckpoints = [];
    this.activeFinish     = null;
    this.boostPadMeshes   = [];
  }
}
