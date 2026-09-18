import * as THREE from 'three';
import {
  type AABBCollider,
  type MovingHazardCollider,
  type BouncePadCollider,
  type CrystalCollider,
  type CheckpointCollider,
  type GoalCollider,
  testSphereAABB,
} from './collider.ts';

export interface OrbPhysicsCallbacks {
  onBounce: (intensity: number) => void;
  onCollect: (id: string) => void;
  onCheckpoint: (id: string, pos: THREE.Vector3) => void;
  onLaunch: (impulse: number) => void;
  onHazard: () => void;
  onGoal: () => void;
}

export class OrbPhysics {
  public position: THREE.Vector3 = new THREE.Vector3(0, 1.5, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public angularVelocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public orientation: THREE.Quaternion = new THREE.Quaternion();

  public readonly radius: number = 0.42;
  public readonly mass: number = 1.0;
  public readonly gravity: number = -22.0;

  // Soft body deformation states
  public deformationNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  public deformationAmount: number = 0; // Current compression factor
  public deformationVelocity: number = 0; // Spring speed
  public readonly springStiffness: number = 180.0;
  public readonly springDamping: number = 14.0;

  public isGrounded: boolean = false;
  private coyoteTimer: number = 0;
  private jumpBufferTimer: number = 0;
  private readonly coyoteDuration: number = 0.14; // seconds
  private readonly jumpBufferDuration: number = 0.12; // seconds

  // Contact normal for ground aligning
  public groundNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

  public lastSafePosition: THREE.Vector3 = new THREE.Vector3(0, 1.5, 0);
  public callbacks: OrbPhysicsCallbacks | null = null;

  constructor(startPos?: THREE.Vector3) {
    if (startPos) {
      this.position.copy(startPos);
      this.lastSafePosition.copy(startPos);
    }
  }

  public reset(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.lastSafePosition.copy(pos);
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.orientation.identity();
    this.deformationAmount = 0;
    this.deformationVelocity = 0;
    this.isGrounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
  }

  public triggerJump(): void {
    this.jumpBufferTimer = this.jumpBufferDuration;
  }

  public update(
    dt: number,
    inputMove: THREE.Vector2, // Normalized direction (x = right/left, y = forward/back)
    cameraHeading: number,
    boxes: AABBCollider[],
    hazards: MovingHazardCollider[],
    bouncePads: BouncePadCollider[],
    crystals: CrystalCollider[],
    checkpoints: CheckpointCollider[],
    goal: GoalCollider | null
  ): void {
    const clampedDt = Math.min(dt, 0.033);

    // Timers
    if (this.isGrounded) {
      this.coyoteTimer = this.coyoteDuration;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - clampedDt);
    }
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - clampedDt);

    // 1. Calculate input rolling force aligned with camera
    const inputForce = new THREE.Vector3();
    if (inputMove.lengthSq() > 0.001) {
      const forward = new THREE.Vector3(Math.sin(cameraHeading), 0, Math.cos(cameraHeading));
      const right = new THREE.Vector3(Math.cos(cameraHeading), 0, -Math.sin(cameraHeading));

      inputForce.addScaledVector(forward, -inputMove.y);
      inputForce.addScaledVector(right, inputMove.x);
      inputForce.normalize();

      const accel = this.isGrounded ? 38.0 : 16.0;
      this.velocity.addScaledVector(inputForce, accel * clampedDt);

      // Apply angular velocity to match rolling direction
      const rollAxis = new THREE.Vector3(inputForce.z, 0, -inputForce.x).normalize();
      const targetSpin = (this.velocity.length() / this.radius) * 1.1;
      this.angularVelocity.addScaledVector(rollAxis, targetSpin * clampedDt * 12.0);
    }

    // 2. Jump execution (Coyote Time + Jump Buffering)
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.isGrounded = false;

      // Squish anticipation & explosive pop
      this.velocity.y = Math.max(this.velocity.y, 0) + 10.5;
      this.deformationAmount = -0.32; // Vertical stretch
      this.deformationVelocity = -12.0;

      this.callbacks?.onBounce(1.2);
    }

    // 3. Gravity and Air Drag
    this.velocity.y += this.gravity * clampedDt;

    const planarVel = new THREE.Vector2(this.velocity.x, this.velocity.z);
    const speed = planarVel.length();
    const maxSpeed = 16.0;
    if (speed > maxSpeed) {
      planarVel.multiplyScalar(maxSpeed / speed);
      this.velocity.x = planarVel.x;
      this.velocity.z = planarVel.y;
    }

    // Surface friction and air resistance
    const friction = this.isGrounded ? 4.2 : 0.8;
    this.velocity.x -= this.velocity.x * friction * clampedDt;
    this.velocity.z -= this.velocity.z * friction * clampedDt;
    this.angularVelocity.multiplyScalar(Math.max(0, 1 - 2.8 * clampedDt));

    // 4. Integrate position & rotation
    this.position.addScaledVector(this.velocity, clampedDt);

    // Orientation integration
    const spinSpeed = this.angularVelocity.length();
    if (spinSpeed > 0.001) {
      const deltaRot = new THREE.Quaternion().setFromAxisAngle(
        this.angularVelocity.clone().multiplyScalar(1 / spinSpeed),
        spinSpeed * clampedDt
      );
      this.orientation.premultiply(deltaRot);
      this.orientation.normalize();
    }

    // 5. Collision with Solid Platforms / Boxes
    this.isGrounded = false;
    let strongestImpact = 0;
    let impactNormal = new THREE.Vector3(0, 1, 0);

    for (const box of boxes) {
      const col = testSphereAABB(this.position, this.radius, box.min, box.max, box.restitution, box.friction);
      if (col.collided) {
        // Positional correction
        this.position.addScaledVector(col.contactNormal, col.penetration);

        // Velocity decomposition
        const normalVel = this.velocity.dot(col.contactNormal);
        if (normalVel < 0) {
          const impactSpeed = -normalVel;
          if (impactSpeed > strongestImpact) {
            strongestImpact = impactSpeed;
            impactNormal.copy(col.contactNormal);
          }

          // Elastic bounce
          const restitution = col.restitution ?? 0.35;
          this.velocity.addScaledVector(col.contactNormal, -normalVel * (1 + restitution));

          // Surface friction impulse
          const tangentVel = this.velocity.clone().sub(col.contactNormal.clone().multiplyScalar(this.velocity.dot(col.contactNormal)));
          tangentVel.multiplyScalar(Math.max(0, 1 - (col.friction ?? 0.5) * 0.15));
          this.velocity.x = tangentVel.x;
          this.velocity.z = tangentVel.z;
        }

        // Check if this surface acts as ground (normal pointing mostly upward)
        if (col.contactNormal.y > 0.6) {
          this.isGrounded = true;
          this.groundNormal.copy(col.contactNormal);
        }
      }
    }

    // Apply soft body deformation on impact
    if (strongestImpact > 1.2) {
      const compression = Math.min(0.55, strongestImpact * 0.04);
      this.deformationAmount = Math.max(this.deformationAmount, compression);
      this.deformationVelocity += strongestImpact * 3.5;
      this.deformationNormal.copy(impactNormal);
      this.callbacks?.onBounce(strongestImpact / 6);
    }

    // 6. Update Soft Body Spring-Damper
    const springForce = -this.springStiffness * this.deformationAmount;
    const dampingForce = -this.springDamping * this.deformationVelocity;
    const accel = springForce + dampingForce;
    this.deformationVelocity += accel * clampedDt;
    this.deformationAmount += this.deformationVelocity * clampedDt;
    this.deformationAmount = Math.max(-0.4, Math.min(0.65, this.deformationAmount));

    // 7. Check Bounce Pads
    for (const pad of bouncePads) {
      const dx = Math.abs(this.position.x - pad.position.x);
      const dz = Math.abs(this.position.z - pad.position.z);
      const dy = this.position.y - pad.position.y;

      if (dx < pad.width * 0.5 + this.radius && dz < pad.depth * 0.5 + this.radius && dy > 0 && dy < this.radius + 0.35) {
        if (this.velocity.y <= 2.0) {
          this.velocity.y = pad.launchImpulse;
          this.deformationAmount = 0.5;
          this.deformationVelocity = 18.0;
          this.callbacks?.onLaunch(pad.launchImpulse);
        }
      }
    }

    // 8. Check Hazards
    for (const hazard of hazards) {
      const flatDist = Math.hypot(this.position.x - hazard.position.x, this.position.z - hazard.position.z);
      const dy = this.position.y - hazard.position.y;
      if (flatDist < hazard.radius + this.radius && Math.abs(dy) < hazard.height * 0.5 + this.radius) {
        // Hit hazard!
        this.callbacks?.onHazard();
        this.reset(this.lastSafePosition);
        return;
      }
    }

    // 9. Check Collectibles (Crystals)
    for (const crystal of crystals) {
      if (crystal.collected) continue;
      const dist = this.position.distanceTo(crystal.position);
      if (dist < crystal.radius + this.radius) {
        crystal.collected = true;
        this.callbacks?.onCollect(crystal.id);
      }
    }

    // 10. Check Checkpoints
    for (const cp of checkpoints) {
      const dist = this.position.distanceTo(cp.position);
      if (dist < cp.radius + this.radius) {
        if (!cp.activated) {
          cp.activated = true;
          this.lastSafePosition.copy(cp.position).add(new THREE.Vector3(0, 0.5, 0));
          this.callbacks?.onCheckpoint(cp.id, this.lastSafePosition);
        }
      }
    }

    // 11. Check Goal
    if (goal) {
      const dist = this.position.distanceTo(goal.position);
      if (dist < goal.radius + this.radius) {
        this.callbacks?.onGoal();
      }
    }

    // 12. Fall Boundary Respawn
    if (this.position.y < -12.0) {
      this.callbacks?.onHazard();
      this.reset(this.lastSafePosition);
    }
  }
}
