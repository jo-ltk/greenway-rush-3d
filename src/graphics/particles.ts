import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  public group: THREE.Group;
  private particles: Particle[] = [];
  private maxParticles = 600;

  private pointsGeom: THREE.BufferGeometry;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private pointsMesh: THREE.Points;

  constructor() {
    this.group = new THREE.Group();

    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    this.pointsGeom = new THREE.BufferGeometry();
    this.pointsGeom.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.pointsGeom.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.pointsGeom.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    // Soft particle texture — white core fading to transparent
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,230,130,0.85)');
    gradient.addColorStop(0.65, 'rgba(180,120,60,0.4)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      size: 0.32,
      vertexColors: true,
      map: texture,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.pointsMesh = new THREE.Points(this.pointsGeom, mat);
    this.group.add(this.pointsMesh);
  }

  /** Dust trail when driving on dirt/grass */
  public emitDust(pos: THREE.Vector3, vel: THREE.Vector3): void {
    if (this.particles.length >= this.maxParticles) return;
    this.particles.push({
      position: pos.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        -0.15,
        (Math.random() - 0.5) * 0.3
      )),
      velocity: vel.clone().multiplyScalar(-0.08).add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.6,
        0.3 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.6
      )),
      color: new THREE.Color().setHSL(0.09 + Math.random() * 0.04, 0.55, 0.62 + Math.random() * 0.15),
      size: 0.22 + Math.random() * 0.14,
      life: 0,
      maxLife: 0.45 + Math.random() * 0.35,
    });
  }

  /** Boost trail — orange sparks from rear of car */
  public emitBoost(pos: THREE.Vector3, forward: THREE.Vector3): void {
    const count = 5;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      this.particles.push({
        position: pos.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.25,
          (Math.random() - 0.5) * 0.15,
          (Math.random() - 0.5) * 0.25
        )),
        velocity: forward.clone().multiplyScalar(-2.5 - Math.random() * 2.0).add(new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          0.2 + Math.random() * 0.8,
          (Math.random() - 0.5) * 1.5
        )),
        color: new THREE.Color().setHSL(0.08 + Math.random() * 0.04, 1.0, 0.6),
        size: 0.28 + Math.random() * 0.14,
        life: 0,
        maxLife: 0.3 + Math.random() * 0.2,
      });
    }
  }

  /** Token pickup burst — yellow/gold coins effect */
  public emitCollectBurst(pos: THREE.Vector3): void {
    const count = 28;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 1.8 + Math.random() * 3.0;
      this.particles.push({
        position: pos.clone(),
        velocity: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.cos(phi) * speed + 1.0,
          Math.sin(phi) * Math.sin(theta) * speed
        ),
        color: new THREE.Color().setHSL(0.13 + Math.random() * 0.06, 1.0, 0.62),
        size: 0.32,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3,
      });
    }
  }

  /** Finish line celebration — confetti */
  public emitFinishCelebration(pos: THREE.Vector3): void {
    const confettiHues = [0.08, 0.15, 0.33, 0.58, 0.75, 0.0];
    const count = 60;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const theta = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 5.0;
      this.particles.push({
        position: pos.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 2.0,
          Math.random() * 1.5,
          (Math.random() - 0.5) * 2.0
        )),
        velocity: new THREE.Vector3(
          Math.cos(theta) * speed * 0.5,
          3.0 + Math.random() * 5.0,
          Math.sin(theta) * speed * 0.5
        ),
        color: new THREE.Color().setHSL(confettiHues[i % confettiHues.length], 0.85, 0.60),
        size: 0.25 + Math.random() * 0.18,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.8,
      });
    }
  }

  /** Landing impact dust puff */
  public emitLanding(pos: THREE.Vector3, intensity: number): void {
    const count = Math.min(20, Math.floor(8 + intensity * 8));
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (i / count) * Math.PI * 2;
      const speed = 1.2 + Math.random() * intensity * 0.4;
      this.particles.push({
        position: pos.clone().add(new THREE.Vector3(0, -0.1, 0)),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          0.8 + Math.random(),
          Math.sin(angle) * speed
        ),
        color: new THREE.Color().setHSL(0.08, 0.4, 0.6),
        size: 0.3,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.3,
      });
    }
  }

  /** Respawn effect — gentle white sparkle */
  public emitRespawn(pos: THREE.Vector3): void {
    for (let i = 0; i < 25; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const theta = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      this.particles.push({
        position: pos.clone(),
        velocity: new THREE.Vector3(
          Math.cos(theta) * speed,
          2.0 + Math.random() * 2.0,
          Math.sin(theta) * speed
        ),
        color: new THREE.Color().setHSL(0.33, 0.6, 0.7),
        size: 0.25,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
      });
    }
  }

  public update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 5.0 * dt;
      p.velocity.multiplyScalar(Math.max(0, 1 - 1.8 * dt));
    }

    const count = this.particles.length;
    for (let i = 0; i < this.maxParticles; i++) {
      const idx3 = i * 3;
      if (i < count) {
        const p = this.particles[i];
        const progress = p.life / p.maxLife;
        const fade = 1.0 - progress;

        this.positions[idx3] = p.position.x;
        this.positions[idx3 + 1] = p.position.y;
        this.positions[idx3 + 2] = p.position.z;

        this.colors[idx3] = p.color.r * fade;
        this.colors[idx3 + 1] = p.color.g * fade;
        this.colors[idx3 + 2] = p.color.b * fade;

        this.sizes[i] = p.size * (0.4 + 0.6 * fade);
      } else {
        this.positions[idx3] = 0;
        this.positions[idx3 + 1] = -9999;
        this.positions[idx3 + 2] = 0;
        this.sizes[i] = 0;
      }
    }

    this.pointsGeom.attributes.position.needsUpdate = true;
    this.pointsGeom.attributes.color.needsUpdate = true;
    this.pointsGeom.attributes.size.needsUpdate = true;
  }
}
