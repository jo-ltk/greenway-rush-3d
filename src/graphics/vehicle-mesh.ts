import * as THREE from 'three';
import type { VehiclePhysics } from '../physics/vehicle-physics.ts';

/**
 * Procedural mini buggy / go-kart mesh built from Three.js primitives.
 * Body (yellow), roof (cream), 4 rubber wheels with silver hubs,
 * brake lights (red emissive), headlights, suspension animation.
 *
 * WHEEL ROTATION HIERARCHY:
 *
 *   wGroup  (steering pivot)
 *     └─ rollGroup  (rolling pivot)
 *          ├─ tyre   CylinderGeometry, rotation.z = PI/2 baked in
 *          ├─ hub    CylinderGeometry, rotation.z = PI/2 baked in
 *          └─ spokeGroup  rotation.z = PI/2 baked in
 *
 *   The tyre cylinder is created with rotation.z = PI/2 so its flat face
 *   points left/right.  After that baked rotation the cylinder's local
 *   Y-axis lines up with the world X-axis (the left-right axle).
 *   Rotating rollGroup around its own Y therefore spins the tyre around
 *   the axle — forward rolling.
 *
 *   Steering  →  wGroup.rotation.y    (turns the whole assembly around the
 *                                       vehicle's vertical axis — front wheels only)
 *   Rolling   →  rollGroup.rotation.x  (spins tyre/hub/spokes around the axle)
 *
 *   wGroup and rollGroup are plain THREE.Group — no baked rotation on them.
 *   Their local X axis is the vehicle's left-right axle, so rotation.x on
 *   rollGroup spins the tyre exactly around its physical axle.
 *
 *   The two rotations are kept strictly separate so neither overwrites the other.
 *
 *   SIGN of wheelSpin (from physics):
 *     wheelSpin -= (forwardSpeed / wheelRadius) * dt
 *   Right-hand rule on +X axle: forward (+Z) motion requires negative
 *   rotation (top of wheel moves toward +Z), so a decreasing wheelSpin
 *   applied as rollGroup.rotation.x produces correct forward rolling.
 */
export class VehicleMesh {
  public group: THREE.Group;

  private bodyMesh: THREE.Mesh;
  private roofMesh: THREE.Mesh;

  /**
   * Outer groups — one per wheel [FL, FR, RL, RR].
   * These are the STEERING pivots; only front wheels have their rotation.y set.
   */
  private wheelMeshes: THREE.Group[] = [];

  /**
   * Inner groups — one per wheel, children of the corresponding wheelMeshes entry.
   * These are the ROLLING pivots; all four have rotation.y driven by wheelSpin.
   */
  private wheelRollGroups: THREE.Group[] = [];

  private brakeLight1: THREE.Mesh;
  private brakeLight2: THREE.Mesh;
  private brakeLightMat: THREE.MeshStandardMaterial;
  private bodyGroup: THREE.Group;

  constructor() {
    this.group     = new THREE.Group();
    this.bodyGroup = new THREE.Group();
    this.group.add(this.bodyGroup);

    // ── Materials ──────────────────────────────────────────────────
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf5c842,
      roughness: 0.35,
      metalness: 0.15,
    });
    const bodyAccentMat = new THREE.MeshStandardMaterial({
      color: 0x2d9c4a,
      roughness: 0.4,
      metalness: 0.1,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xfdf6e3,
      roughness: 0.5,
      metalness: 0.0,
    });
    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.95,
      metalness: 0.0,
    });
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.3,
      metalness: 0.8,
    });

    this.brakeLightMat = new THREE.MeshStandardMaterial({
      color: 0xff2200,
      emissive: 0xff2200,
      emissiveIntensity: 0.0,
      roughness: 0.3,
    });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffee,
      emissive: 0xffffcc,
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });

    // ── Body ──────────────────────────────────────────────────────
    const bodyGeom = new THREE.BoxGeometry(0.82, 0.28, 1.22);
    this.bodyMesh  = new THREE.Mesh(bodyGeom, bodyMat);
    this.bodyMesh.position.set(0, 0.14, 0);
    this.bodyMesh.castShadow = true;
    this.bodyGroup.add(this.bodyMesh);

    const bumperGeom = new THREE.BoxGeometry(0.88, 0.14, 0.12);
    const frontBumper = new THREE.Mesh(bumperGeom, bodyAccentMat);
    frontBumper.position.set(0, 0.07, 0.65);
    frontBumper.castShadow = true;
    this.bodyGroup.add(frontBumper);

    const rearBumper = new THREE.Mesh(bumperGeom, bodyAccentMat);
    rearBumper.position.set(0, 0.07, -0.65);
    rearBumper.castShadow = true;
    this.bodyGroup.add(rearBumper);

    const roofGeom  = new THREE.BoxGeometry(0.72, 0.22, 0.72);
    this.roofMesh   = new THREE.Mesh(roofGeom, roofMat);
    this.roofMesh.position.set(0, 0.39, -0.02);
    this.roofMesh.castShadow = true;
    this.bodyGroup.add(this.roofMesh);

    const windshieldMat = new THREE.MeshStandardMaterial({
      color: 0xaaddff,
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.7,
    });
    const windshieldGeom = new THREE.BoxGeometry(0.68, 0.18, 0.06);
    const windshield     = new THREE.Mesh(windshieldGeom, windshieldMat);
    windshield.position.set(0, 0.38, 0.36);
    this.bodyGroup.add(windshield);

    const rearWindow = new THREE.Mesh(windshieldGeom, windshieldMat);
    rearWindow.position.set(0, 0.38, -0.4);
    this.bodyGroup.add(rearWindow);

    const headlightGeom = new THREE.BoxGeometry(0.16, 0.08, 0.05);
    const hl1 = new THREE.Mesh(headlightGeom, headlightMat);
    hl1.position.set(-0.28, 0.16, 0.625);
    this.bodyGroup.add(hl1);
    const hl2 = new THREE.Mesh(headlightGeom, headlightMat);
    hl2.position.set(0.28, 0.16, 0.625);
    this.bodyGroup.add(hl2);

    const brakeLightGeom = new THREE.BoxGeometry(0.15, 0.07, 0.04);
    this.brakeLight1 = new THREE.Mesh(brakeLightGeom, this.brakeLightMat);
    this.brakeLight1.position.set(-0.28, 0.16, -0.625);
    this.bodyGroup.add(this.brakeLight1);

    this.brakeLight2 = new THREE.Mesh(brakeLightGeom, this.brakeLightMat);
    this.brakeLight2.position.set(0.28, 0.16, -0.625);
    this.bodyGroup.add(this.brakeLight2);

    const stripeGeom = new THREE.BoxGeometry(0.18, 0.01, 1.22);
    const stripeMat  = new THREE.MeshStandardMaterial({ color: 0x2d9c4a, roughness: 0.5 });
    const stripe     = new THREE.Mesh(stripeGeom, stripeMat);
    stripe.position.set(0, 0.281, 0);
    this.bodyGroup.add(stripe);

    // ── Wheels ────────────────────────────────────────────────────
    // [FL, FR, RL, RR]
    const wheelPositions: [number, number, number][] = [
      [-0.52, 0, 0.48],
      [ 0.52, 0, 0.48],
      [-0.52, 0, -0.46],
      [ 0.52, 0, -0.46],
    ];

    for (let i = 0; i < 4; i++) {
      // ── Steering pivot ────────────────────────────────────────
      // Sits at the wheel's position in vehicle space.
      // For front wheels, rotation.y is set to the steer angle each frame.
      // For rear wheels, rotation.y stays 0.
      const wGroup = new THREE.Group();
      wGroup.position.set(...wheelPositions[i]);

      // ── Rolling pivot ─────────────────────────────────────────
      // Child of the steering pivot.
      // rotation.y is driven by physics.wheelSpin every frame.
      // Because all tyre geometry has rotation.z = PI/2 baked in,
      // rotating this group around Y spins the tyre around the axle (world X).
      const rollGroup = new THREE.Group();

      // Tyre — cylinder with flat face pointing left/right
      // rotation.z = PI/2  →  local Y-axis runs along world X (the roll axle)
      const tyreGeom = new THREE.CylinderGeometry(0.22, 0.22, 0.18, 20);
      const tyre     = new THREE.Mesh(tyreGeom, rubberMat);
      tyre.rotation.z = Math.PI / 2;
      tyre.castShadow = true;
      rollGroup.add(tyre);

      // Hub
      const hubGeom = new THREE.CylinderGeometry(0.10, 0.10, 0.22, 12);
      const hub     = new THREE.Mesh(hubGeom, hubMat);
      hub.rotation.z = Math.PI / 2;
      rollGroup.add(hub);

      // Spokes — sub-group aligned with the tyre, spins with the tyre
      const spokeGroup = new THREE.Group();
      spokeGroup.rotation.z = Math.PI / 2;
      for (let s = 0; s < 3; s++) {
        const angle     = (s / 3) * Math.PI * 2;
        const spokeGeom = new THREE.BoxGeometry(0.04, 0.23, 0.04);
        const spoke     = new THREE.Mesh(spokeGeom, hubMat);
        spoke.position.set(0, Math.cos(angle) * 0.065, Math.sin(angle) * 0.065);
        spokeGroup.add(spoke);
      }
      rollGroup.add(spokeGroup);

      // Wire up hierarchy: steering pivot → rolling pivot → geometry
      wGroup.add(rollGroup);

      this.wheelMeshes.push(wGroup);
      this.wheelRollGroups.push(rollGroup);
      this.group.add(wGroup);
    }

    // ── Ambient fill light ─────────────────────────────────────────
    const carLight = new THREE.PointLight(0xfff4cc, 0.6, 4.0);
    carLight.position.set(0, 1.0, 0);
    this.bodyGroup.add(carLight);
  }

  public update(physics: VehiclePhysics, _timeSec: number, brakeInput: boolean): void {
    // 1. Position & heading
    this.group.position.copy(physics.position);
    this.group.rotation.y = physics.heading;

    // 2. Body roll / pitch / bounce
    this.bodyGroup.position.y = physics.bodyBounce * 0.6;
    this.bodyGroup.rotation.z = physics.bodyRoll;
    this.bodyGroup.rotation.x = -physics.bodyPitch;

    // 3. Wheel steering + rolling — two strictly separate rotations
    //
    // Steering (wGroup — outer pivot, rotation.y):
    //   Rotates the entire wheel assembly around the vehicle's vertical axis.
    //   Only front wheels steer.  Sign is negated to match the physics
    //   heading convention (positive steerAngle = visual right turn).
    //
    // Rolling (rollGroup — inner pivot, rotation.x):
    //   The wGroup and rollGroup are plain THREE.Group with no baked rotation.
    //   Their local X axis is the vehicle's local X axis — the left-right axle.
    //   Rotating rollGroup around X therefore spins the tyre around its axle.
    //
    //   physics.wheelSpin is accumulated as:
    //     wheelSpin -= (forwardSpeed / wheelRadius) * dt
    //   Right-hand rule on +X axle: forward (+Z) motion requires negative
    //   rotation (top of wheel moves forward = clockwise viewed from +X),
    //   so the decreasing wheelSpin value produces correct forward rolling.
    //   Reversing (S key) makes forwardSpeed negative → wheelSpin increases
    //   → rotation.x increases → wheel rolls backward. Correct.

    const spin = physics.wheelSpin;

    for (let i = 0; i < 4; i++) {
      // Steering pivot — front wheels only, around local Y (vertical axis)
      this.wheelMeshes[i].rotation.y = (i < 2) ? -physics.steerAngle : 0;

      // Rolling pivot — all wheels, around local X (left-right axle)
      this.wheelRollGroups[i].rotation.x = spin;
    }

    // 4. Wheel vertical position (suspension)
    const wheelY = -0.08 + physics.bodyBounce * 0.4;
    for (const w of this.wheelMeshes) {
      w.position.y = wheelY;
    }

    // 5. Brake lights
    this.brakeLightMat.emissiveIntensity = brakeInput ? 2.5 : 0.0;
  }
}
