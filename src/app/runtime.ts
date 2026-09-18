import * as THREE from 'three';
import { createRenderer, handleResize } from '../graphics/renderer.ts';
import { CameraController } from '../graphics/camera-controller.ts';
import { VehiclePhysics } from '../physics/vehicle-physics.ts';
import { VehicleMesh } from '../graphics/vehicle-mesh.ts';
import { ParticleSystem } from '../graphics/particles.ts';
import { LevelManager } from '../levels/level-manager.ts';
import { SoundSystem } from '../audio/synth.ts';
import { InputManager } from './input.ts';

export type GameState = 'MENU' | 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'LEVEL_COMPLETE' | 'GAME_WON';

export interface GameUIEvents {
  onTokenUpdate: (collected: number, total: number) => void;
  onTimeUpdate: (seconds: number) => void;
  onSpeedUpdate: (kmh: number) => void;
  onBestTimeUpdate: (seconds: number | null) => void;
  onTrackLoaded: (index: number, trackName: string, title: string, difficulty: string) => void;
  onCheckpointTriggered: () => void;
  onCountdown: (n: number) => void; // 3, 2, 1, 0 = GO
  onLevelComplete: (stats: { track: number; time: number; tokens: number; totalTokens: number; bestTime: number | null; goldTime: number; silverTime: number }) => void;
  onGameWon: (stats: { totalTime: number; totalTokens: number }) => void;
  onBoostActive: (active: boolean) => void;
  onStateChange: (state: GameState) => void;
  onRespawn: () => void;
}

export class GameRuntime {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public cameraController: CameraController;

  public sound: SoundSystem;
  public input: InputManager;
  public levelManager: LevelManager;
  public particles: ParticleSystem;

  public physics: VehiclePhysics;
  public vehicleMesh: VehicleMesh;

  public state: GameState = 'MENU';
  public totalTokensInLevel: number = 0;
  public collectedTokensInLevel: number = 0;
  public raceTimer: number = 0;
  public overallTimer: number = 0;
  public totalTokensCollected: number = 0;

  private isRunning: boolean = false;
  private lastFrameTime: number = 0;
  private uiEvents: GameUIEvents;

  // Countdown state
  private countdownTimer: number = 0;
  private countdownStep: number = 3; // 3,2,1,0(GO)

  // Drift/skid tracking
  private lastSkidTime: number = 0;
  private boostWasActive: boolean = false;

  constructor(viewportEl: HTMLElement, uiEvents: GameUIEvents) {
    this.uiEvents = uiEvents;

    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // sky blue
    this.scene.fog = new THREE.Fog(0xc8e8f0, 80, 200);

    // 2. Camera & Renderer
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(52, aspect, 0.1, 300);
    this.renderer = createRenderer();
    viewportEl.appendChild(this.renderer.domElement);

    this.cameraController = new CameraController(this.camera, this.renderer.domElement);

    // 3. Natural Lighting
    this.setupLighting();

    // 4. Game Systems
    this.sound = new SoundSystem();
    this.input = new InputManager();
    this.levelManager = new LevelManager();
    this.scene.add(this.levelManager.group);

    this.particles = new ParticleSystem();
    this.scene.add(this.particles.group);

    this.physics = new VehiclePhysics();
    this.vehicleMesh = new VehicleMesh();
    this.scene.add(this.vehicleMesh.group);

    // 5. Physics Callbacks
    this.setupPhysicsCallbacks();

    // 6. Window Resize
    window.addEventListener('resize', () => {
      handleResize(this.renderer, this.camera);
    });

    // 7. Load first track for preview
    this.loadLevel(0);
  }

  private setupLighting(): void {
    // Warm ambient sky light
    const ambientLight = new THREE.AmbientLight(0xfff4e0, 1.4);
    this.scene.add(ambientLight);

    // Main sun (warm directional)
    const sunLight = new THREE.DirectionalLight(0xffe5b4, 2.8);
    sunLight.position.set(30, 60, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60;
    sunLight.shadow.camera.bottom = -60;
    sunLight.shadow.bias = -0.0004;
    this.scene.add(sunLight);

    // Sky bounce (cool blue fill from above)
    const skyFill = new THREE.DirectionalLight(0xadd8e6, 0.7);
    skyFill.position.set(-10, 30, -15);
    this.scene.add(skyFill);

    // Warm ground bounce
    const groundBounce = new THREE.HemisphereLight(0x87ceeb, 0x5eb965, 0.5);
    this.scene.add(groundBounce);
  }

  private setupPhysicsCallbacks(): void {
    this.physics.callbacks = {
      onCollect: (_id: string) => {
        this.sound.playCollect();
        this.particles.emitCollectBurst(this.physics.position);
        this.collectedTokensInLevel++;
        this.totalTokensCollected++;
        this.uiEvents.onTokenUpdate(this.collectedTokensInLevel, this.totalTokensInLevel);
      },
      onCheckpoint: (_id: string, pos: THREE.Vector3) => {
        this.sound.playCheckpoint();
        this.uiEvents.onCheckpointTriggered();
        // small celebration
        this.particles.emitCollectBurst(pos);
      },
      onBoost: (_impulse: number) => {
        this.sound.playBoost();
      },
      onHazard: () => {
        this.sound.playHazard();
        this.particles.emitRespawn(this.physics.position);
        this.uiEvents.onRespawn();
      },
      onGoal: () => {
        this.handleTrackComplete();
      },
      onLand: (impact: number) => {
        this.sound.playLand(impact);
        this.particles.emitLanding(this.physics.position, impact);
        this.cameraController.triggerShake(impact);
      },
    };
  }

  public loadLevel(levelIndex: number): void {
    const data = this.levelManager.loadLevel(levelIndex);
    const spawn = new THREE.Vector3(...data.spawnPoint);

    this.physics.reset(spawn, data.spawnHeading);
    this.vehicleMesh.group.position.copy(spawn);
    this.vehicleMesh.group.rotation.y = data.spawnHeading;
    this.cameraController.snapTo(spawn, data.spawnHeading);

    this.totalTokensInLevel = data.tokens.length;
    this.collectedTokensInLevel = 0;
    this.raceTimer = 0;

    this.uiEvents.onTrackLoaded(levelIndex, data.trackName, data.trackTitle, data.difficulty);
    this.uiEvents.onTokenUpdate(0, this.totalTokensInLevel);
    this.uiEvents.onSpeedUpdate(0);

    // Load best time from localStorage
    const bestTime = this.getBestTime(levelIndex);
    this.uiEvents.onBestTimeUpdate(bestTime);
  }

  public startPlay(): void {
    this.sound.init();
    this.sound.ensureContext();
    this.startCountdown();
  }

  private startCountdown(): void {
    this.setState('COUNTDOWN');
    this.countdownStep = 3;
    this.countdownTimer = 0;
    this.uiEvents.onCountdown(3);
    this.sound.playCountdownBeep(3);
  }

  private tickCountdown(dt: number): void {
    this.countdownTimer += dt;
    if (this.countdownTimer >= 1.0) {
      this.countdownTimer -= 1.0;
      this.countdownStep--;

      if (this.countdownStep > 0) {
        this.uiEvents.onCountdown(this.countdownStep);
        this.sound.playCountdownBeep(this.countdownStep);
      } else {
        // GO!
        this.uiEvents.onCountdown(0);
        this.sound.playCountdownBeep(0);
        this.setState('PLAYING');
      }
    }
  }

  public pauseGame(): void {
    if (this.state === 'PLAYING') this.setState('PAUSED');
  }

  public resumeGame(): void {
    if (this.state === 'PAUSED') {
      this.sound.ensureContext();
      this.setState('PLAYING');
    }
  }

  public restartCurrentLevel(): void {
    this.loadLevel(this.levelManager.currentLevelIndex);
    this.startPlay();
  }

  public nextLevel(): void {
    const nextIdx = this.levelManager.currentLevelIndex + 1;
    if (nextIdx < this.levelManager.totalLevels) {
      this.loadLevel(nextIdx);
      this.startPlay();
    } else {
      this.setState('GAME_WON');
      this.uiEvents.onGameWon({
        totalTime: this.overallTimer,
        totalTokens: this.totalTokensCollected,
      });
    }
  }

  private handleTrackComplete(): void {
    if (this.state !== 'PLAYING') return;

    this.sound.playVictory();
    this.particles.emitFinishCelebration(this.physics.position);

    const levelIdx = this.levelManager.currentLevelIndex;
    const trackData = this.levelManager.currentTrackData!;

    // Check & save best time
    const oldBest = this.getBestTime(levelIdx);
    const newBest = (oldBest === null || this.raceTimer < oldBest) ? this.raceTimer : oldBest;
    this.saveBestTime(levelIdx, newBest);

    const isLast = levelIdx >= this.levelManager.totalLevels - 1;

    if (isLast) {
      this.setState('GAME_WON');
      this.uiEvents.onGameWon({
        totalTime: this.overallTimer,
        totalTokens: this.totalTokensCollected,
      });
    } else {
      this.setState('LEVEL_COMPLETE');
      this.uiEvents.onLevelComplete({
        track: levelIdx + 1,
        time: this.raceTimer,
        tokens: this.collectedTokensInLevel,
        totalTokens: this.totalTokensInLevel,
        bestTime: newBest,
        goldTime: trackData.goldTime,
        silverTime: trackData.silverTime,
      });
    }
  }

  public setState(newState: GameState): void {
    this.state = newState;
    this.uiEvents.onStateChange(newState);
  }

  private getBestTime(levelIndex: number): number | null {
    const val = localStorage.getItem(`greenway_rush_best_${levelIndex}`);
    return val ? parseFloat(val) : null;
  }

  private saveBestTime(levelIndex: number, time: number): void {
    localStorage.setItem(`greenway_rush_best_${levelIndex}`, String(time));
  }

  public startLoop(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();

    const loop = (currentTime: number) => {
      if (!this.isRunning) return;
      requestAnimationFrame(loop);

      const deltaMs = currentTime - this.lastFrameTime;
      this.lastFrameTime = currentTime;
      const dt = Math.min(deltaMs / 1000, 0.05);

      this.update(dt, currentTime * 0.001);
      this.render();
    };

    requestAnimationFrame(loop);
  }

  public stopLoop(): void {
    this.isRunning = false;
  }

  private update(dt: number, timeSec: number): void {
    // Pause toggle
    if (this.input.consumePause()) {
      if (this.state === 'PLAYING') this.pauseGame();
      else if (this.state === 'PAUSED') this.resumeGame();
    }

    // Manual respawn
    if (this.input.consumeReset()) {
      if (this.state === 'PLAYING') {
        this.physics.reset(this.physics.lastSafePosition, this.physics.lastSafeHeading);
        this.particles.emitRespawn(this.physics.position);
        this.sound.playHazard();
        this.uiEvents.onRespawn();
      }
    }

    if (this.state === 'COUNTDOWN') {
      this.tickCountdown(dt);
      // Animate world but don't move car
    }

    if (this.state === 'PLAYING') {
      this.raceTimer += dt;
      this.overallTimer += dt;
      this.uiEvents.onTimeUpdate(this.raceTimer);

      // Read inputs
      const mv = this.input.moveVector;
      const throttle = mv.y;   // W/S
      const steer = mv.x;      // A/D
      const brakeInput = this.input.isBrakeHeld;

      // Sub-step physics
      const subSteps = 2;
      const subDt = dt / subSteps;
      for (let s = 0; s < subSteps; s++) {
        this.physics.update(
          subDt,
          throttle,
          steer,
          brakeInput,
          this.levelManager.boxes,
          this.levelManager.hazards,
          this.levelManager.boostPads,
          this.levelManager.crystals,
          this.levelManager.checkpoints,
          this.levelManager.goal
        );
      }

      // Speed HUD
      this.uiEvents.onSpeedUpdate(this.physics.speedKmh);

      // Engine sound
      this.sound.updateEngine(
        this.physics.velocity.length(),
        this.physics.isGrounded,
        throttle
      );

      // Dust particles when on ground
      const speed = this.physics.velocity.length();
      if (this.physics.isGrounded && speed > 2.0) {
        this.particles.emitDust(this.physics.position, this.physics.velocity);
      }

      // Boost particles
      if (this.physics.isBoostActive) {
        const fwd = new THREE.Vector3(Math.sin(this.physics.heading), 0, Math.cos(this.physics.heading));
        this.particles.emitBoost(
          this.physics.position.clone().add(fwd.clone().multiplyScalar(-0.7)),
          fwd
        );
      }

      // Skid sound on drift
      const driftMag = Math.abs(this.physics.steerAngle) * speed;
      if (driftMag > 3.5 && timeSec - this.lastSkidTime > 0.4 && this.physics.isGrounded) {
        this.sound.playSkid();
        this.lastSkidTime = timeSec;
      }

      // Boost UI notification
      if (this.physics.isBoostActive !== this.boostWasActive) {
        this.uiEvents.onBoostActive(this.physics.isBoostActive);
        this.boostWasActive = this.physics.isBoostActive;
      }
    } else {
      this.sound.updateEngine(0, false, 0);
    }

    // Always update scene & camera
    this.levelManager.update(timeSec);
    this.particles.update(dt);

    const brakeInput = this.state === 'PLAYING' ? this.input.isBrakeHeld : false;
    this.vehicleMesh.update(this.physics, timeSec, brakeInput);

    this.cameraController.update(
      this.physics.position,
      this.physics.heading,
      this.physics.forwardSpeed,
      dt
    );
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}

export function startGame(viewportEl: HTMLElement, uiEvents: GameUIEvents): GameRuntime {
  const runtime = new GameRuntime(viewportEl, uiEvents);
  runtime.startLoop();
  return runtime;
}
