import * as THREE from 'three';
import {
  type AABBCollider,
  type MovingHazardCollider,
  type BoostPadCollider,
  type CrystalCollider,
  type CheckpointCollider,
  type GoalCollider,
  testSphereAABB,
} from './collider.ts';

export interface VehiclePhysicsCallbacks {
  onCollect:    (id: string) => void;
  onCheckpoint: (id: string, pos: THREE.Vector3) => void;
  onBoost:      (impulse: number) => void;
  onHazard:     () => void;
  onGoal:       () => void;
  onLand:       (impact: number) => void;
}

export class VehiclePhysics {
  // Position/velocity (centre of vehicle, bottom of bounding box on ground)
  public position: THREE.Vector3 = new THREE.Vector3(0, 0.45, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Heading: radians, 0 = +Z axis
  public heading: number = 0;

  // Steer angle (front wheels, radians)
  public steerAngle: number = 0;

  /**
   * Wheel spin (accumulated radians).
   * Accumulated as:  wheelSpin -= fwdSpeed / wheelRadius * dt
   * (negative sign because right-hand-rule on the +X axle requires
   *  negative rotation for forward motion in +Z)
   */
  public wheelSpin: number = 0;

  // Body lean (for visual effect)
  public bodyRoll:   number = 0;
  public bodyPitch:  number = 0;
  public bodyBounce: number = 0;

  public readonly halfWidth:   number = 0.45;
  public readonly halfLength:  number = 0.65;
  public readonly halfHeight:  number = 0.25;
  public readonly wheelRadius: number = 0.22;
  public readonly mass:        number = 1.0;
  public readonly gravity:     number = -22.0;

  public isGrounded:    boolean = false;
  public isBoostActive: boolean = false;
  public boostTimer:    number  = 0;

  public lastSafePosition: THREE.Vector3 = new THREE.Vector3(0, 0.45, 0);
  public lastSafeHeading:  number        = 0;
  public callbacks: VehiclePhysicsCallbacks | null = null;

  // Internal state
  private wasGrounded:    boolean = false;
  private airTime:        number  = 0;
  private driftFactor:    number  = 0;
  private engineForce:    number  = 0;

  // Suspension spring
  private suspensionOffset: number = 0;
  private suspensionVel:    number = 0;

  // Respawn cooldown (prevents double-trigger)
  private respawnCooldown: number = 0;

  constructor(startPos?: THREE.Vector3, startHeading?: number) {
    if (startPos) {
      this.position.copy(startPos);
      this.lastSafePosition.copy(startPos);
    }
    if (startHeading !== undefined) {
      this.heading          = startHeading;
      this.lastSafeHeading  = startHeading;
    }
  }

  public reset(pos: THREE.Vector3, heading?: number): void {
    this.position.copy(pos);
    this.lastSafePosition.copy(pos);
    this.velocity.set(0, 0, 0);
    this.heading         = heading ?? this.lastSafeHeading;
    this.steerAngle      = 0;
    this.wheelSpin       = 0;
    this.bodyRoll        = 0;
    this.bodyPitch       = 0;
    this.bodyBounce      = 0;
    this.isGrounded      = false;
    this.isBoostActive   = false;
    this.boostTimer      = 0;
    this.driftFactor     = 0;
    this.airTime         = 0;
    this.suspensionOffset = 0;
    this.suspensionVel   = 0;
    this.respawnCooldown = 1.0;  // 1 s grace after any reset
  }

  /** Returns current forward speed (positive = forward) */
  public get forwardSpeed(): number {
    const fwd = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    return this.velocity.dot(fwd);
  }

  /** Speed in km/h for HUD */
  public get speedKmh(): number {
    return Math.abs(this.forwardSpeed) * 3.6;
  }

  public update(
    dt: number,
    throttle:   number,       // -1..1  (W=+1, S=-1)
    steer:      number,       // -1..1  (A=-1, D=+1)
    brakeInput: boolean,      // Space
    nitroInput: boolean,      // Nitro button — instant speed jet
    boxes:       AABBCollider[],
    obstacles:   MovingHazardCollider[],
    boostPads:   BoostPadCollider[],
    tokens:      CrystalCollider[],
    checkpoints: CheckpointCollider[],
    goal:        GoalCollider | null
  ): void {
    const clampedDt = Math.min(dt, 0.033);

    // ── Respawn cooldown ──
    if (this.respawnCooldown > 0) {
      this.respawnCooldown -= clampedDt;
    }

    // ── Boost timer ──
    if (this.isBoostActive) {
      this.boostTimer -= clampedDt;
      if (this.boostTimer <= 0) {
        this.isBoostActive = false;
        this.boostTimer    = 0;
      }
    }

    // ── Gravity ──
    this.velocity.y += this.gravity * clampedDt;

    // ── Grounded state ──
    this.wasGrounded = this.isGrounded;
    this.isGrounded  = false;

    // ── Integrate position ──
    this.position.addScaledVector(this.velocity, clampedDt);

    // ── Collision resolution ──
    let strongestImpact = 0;
    for (const box of boxes) {
      const col = testSphereAABB(
        this.position,
        this.halfHeight + this.wheelRadius * 0.6,
        box.min, box.max,
        box.restitution, box.friction
      );
      if (col.collided) {
        this.position.addScaledVector(col.contactNormal, col.penetration);

        const normalVel = this.velocity.dot(col.contactNormal);
        if (normalVel < 0) {
          const impactSpeed = -normalVel;
          if (impactSpeed > strongestImpact) strongestImpact = impactSpeed;

          const restitution = col.restitution ?? 0.08;
          this.velocity.addScaledVector(col.contactNormal, -normalVel * (1 + restitution));

          // Surface friction on tangential component
          const tangent = this.velocity.clone().sub(
            col.contactNormal.clone().multiplyScalar(this.velocity.dot(col.contactNormal))
          );
          tangent.multiplyScalar(Math.max(0, 1 - (col.friction ?? 0.5) * 0.18));
          this.velocity.x = tangent.x;
          this.velocity.z = tangent.z;
        }

        if (col.contactNormal.y > 0.6) {
          this.isGrounded = true;
        }
      }
    }

    // Landing impact
    if (this.isGrounded && !this.wasGrounded) {
      const impact = Math.abs(this.velocity.y) + strongestImpact;
      if (impact > 2.0) {
        this.suspensionVel -= impact * 3.0;
        this.callbacks?.onLand(impact);
      }
    }

    if (!this.isGrounded) this.airTime += clampedDt;
    else                  this.airTime  = 0;

    // ── Car locomotion (only when grounded) ──
    if (this.isGrounded) {
      const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
      const right   = new THREE.Vector3(Math.cos(this.heading), 0, -Math.sin(this.heading));

      const speed    = this.forwardSpeed;
      const absSpeed = Math.abs(speed);

      // Steering — max ~35° at low speed, ~15° at high speed
      const maxSteer   = Math.max(0.26, 0.62 - absSpeed * 0.012);
      const targetSteer = steer * maxSteer;
      this.steerAngle  += (targetSteer - this.steerAngle) * Math.min(1, clampedDt * 10.0);

      // Heading update from steer
      // Negate turnRate: with the (sin/cos) heading convention, positive
      // heading change is counter-clockwise (left), so we subtract to turn
      // right when steerAngle > 0 (D pressed).
      if (absSpeed > 0.5) {
        const turnRate = (speed / (this.halfLength * 2)) * Math.sin(this.steerAngle);
        this.heading  -= turnRate * clampedDt;
      }

      // Drift
      const driftTarget = Math.min(1.0, absSpeed * 0.035 * Math.abs(steer));
      this.driftFactor  += (driftTarget - this.driftFactor) * clampedDt * (brakeInput ? 5.0 : 2.0);

      // ── Engine — INCREASED SPEED ──
      // Normal:  ~26 m/s ≈ 94 km/h   Boost: ~38 m/s ≈ 137 km/h  Nitro jet: instant push
      const maxSpeed = this.isBoostActive ? 38.0 : 26.0;
      const accel    = this.isBoostActive ? 95.0 : 68.0;
      const brakeForce = brakeInput ? 35.0 : 0.0;

      if (Math.abs(throttle) > 0.05) {
        if (speed * Math.sign(throttle) < maxSpeed) {
          this.engineForce = throttle * accel;
        } else {
          this.engineForce = 0;
        }
      } else {
        this.engineForce = 0;
      }

      this.velocity.addScaledVector(forward, this.engineForce * clampedDt);

      // Nitro jet — instant forward impulse, bypasses normal max-speed cap
      if (nitroInput) {
        const nitroAccel = 180.0; // strong burst
        this.velocity.addScaledVector(forward, nitroAccel * clampedDt);
        // Hard-cap so it doesn't go completely insane
        const nitroMaxSpeed = 55.0;
        const currentFwdSpeed = this.velocity.dot(forward);
        if (currentFwdSpeed > nitroMaxSpeed) {
          this.velocity.addScaledVector(forward, nitroMaxSpeed - currentFwdSpeed);
        }
      }

      // Braking / rolling drag
      if (brakeInput || Math.abs(throttle) < 0.05) {
        const brakeMag   = brakeInput ? brakeForce : 7.0;
        const vFwd       = this.velocity.dot(forward);
        const brakeAmount = Math.min(Math.abs(vFwd), brakeMag * clampedDt);
        this.velocity.addScaledVector(forward, -Math.sign(vFwd) * brakeAmount);
      }

      // Lateral friction (grip vs drift)
      const grip = 1.0 - this.driftFactor * 0.65;
      const vLat = this.velocity.dot(right);
      this.velocity.addScaledVector(right, -vLat * grip * Math.min(1, clampedDt * 14.0));

      // Rolling resistance
      const rollFriction = brakeInput ? 0.88 : 0.97;
      this.velocity.x *= Math.pow(rollFriction, clampedDt * 60);
      this.velocity.z *= Math.pow(rollFriction, clampedDt * 60);

      // Save safe position when moving forward on ground
      if (speed > 1.0) {
        this.lastSafePosition.copy(this.position);
        this.lastSafeHeading = this.heading;
      }
    } else {
      // Air drag
      this.velocity.x *= Math.pow(0.99, clampedDt * 60);
      this.velocity.z *= Math.pow(0.99, clampedDt * 60);
    }

    // ── Suspension spring-damper ──
    const suspStiffness = 120.0;
    const suspDamping   = 12.0;
    const suspForce     = -suspStiffness * this.suspensionOffset - suspDamping * this.suspensionVel;
    this.suspensionVel    += suspForce * clampedDt;
    this.suspensionOffset += this.suspensionVel * clampedDt;
    this.suspensionOffset  = Math.max(-0.12, Math.min(0.12, this.suspensionOffset));
    this.bodyBounce        = this.suspensionOffset;

    // Body roll / pitch
    const targetRoll = -this.steerAngle * Math.abs(this.forwardSpeed) * 0.08;
    this.bodyRoll   += (targetRoll - this.bodyRoll) * Math.min(1, clampedDt * 6.0);
    const throttleSign = this.engineForce > 0 ? 1 : (this.engineForce < 0 ? -1 : 0);
    const targetPitch  = throttleSign * 0.04 * Math.min(1, Math.abs(this.forwardSpeed) * 0.1);
    this.bodyPitch    += (targetPitch - this.bodyPitch) * Math.min(1, clampedDt * 5.0);

    // ── Wheel spin (FIXED SIGN) ──
    // Right-hand-rule on +X axle: forward (+Z) = negative rotation.
    // vehicle-mesh reads wheelSpin and applies it as rotation.y on wheel groups
    // whose tyre cylinders have rotation.z = PI/2 (Y-axis → world X).
    const fwdSpeed = this.forwardSpeed;
    this.wheelSpin -= (fwdSpeed / this.wheelRadius) * clampedDt;

    // ── Boost Pads ──
    for (const pad of boostPads) {
      const dx = Math.abs(this.position.x - pad.position.x);
      const dz = Math.abs(this.position.z - pad.position.z);
      const dy = this.position.y - pad.position.y;

      if (
        dx < pad.width * 0.5 + this.halfWidth &&
        dz < pad.depth * 0.5 + this.halfLength &&
        dy > -0.5 && dy < this.halfHeight + 0.4
      ) {
        if (!this.isBoostActive) {
          this.isBoostActive = true;
          this.boostTimer    = 2.5;
          this.callbacks?.onBoost(pad.launchImpulse);
        }
      }
    }

    // ── Moving Obstacles ──
    for (const obs of obstacles) {
      const flatDist = Math.hypot(
        this.position.x - obs.position.x,
        this.position.z - obs.position.z
      );
      const dy = this.position.y - obs.position.y;
      if (
        flatDist < obs.radius + this.halfWidth &&
        Math.abs(dy) < obs.height * 0.5 + this.halfHeight
      ) {
        if (this.respawnCooldown <= 0) {
          this.callbacks?.onHazard();
          this.reset(this.lastSafePosition, this.lastSafeHeading);
        }
        return;
      }
    }

    // ── Tokens (collectibles) ──
    for (const token of tokens) {
      if (token.collected) continue;
      const dist = this.position.distanceTo(token.position);
      if (dist < token.radius + this.halfWidth + 0.2) {
        token.collected = true;
        this.callbacks?.onCollect(token.id);
      }
    }

    // ── Checkpoints ──
    for (const cp of checkpoints) {
      const dist = this.position.distanceTo(cp.position);
      if (dist < cp.radius + this.halfWidth + 0.3) {
        if (!cp.activated) {
          cp.activated = true;
          // Save a point 0.5 m above the checkpoint so respawn never clips ground
          this.lastSafePosition.copy(cp.position).setY(cp.position.y + 0.5);
          this.lastSafeHeading = this.heading;
          this.callbacks?.onCheckpoint(cp.id, this.lastSafePosition);
        }
      }
    }

    // ── Finish Line (Goal) ──
    if (goal) {
      const dist = this.position.distanceTo(goal.position);
      if (dist < goal.radius + this.halfLength) {
        this.callbacks?.onGoal();
      }
    }

    // ── Fall / Out-of-bounds Respawn ──
    // Trigger if:
    //   (a) car falls below road level (Y < -2), or
    //   (b) car is airborne for more than 4 seconds (stuck / off track)
    if (this.respawnCooldown <= 0) {
      const fellOff  = this.position.y < -2.0;
      const stranded = !this.isGrounded && this.airTime > 4.0;

      if (fellOff || stranded) {
        this.callbacks?.onHazard();
        this.reset(this.lastSafePosition, this.lastSafeHeading);
      }
    }
  }
}
