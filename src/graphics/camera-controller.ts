import * as THREE from 'three';

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public target: THREE.Vector3 = new THREE.Vector3(0, 0.4, 0);
  public currentLookAt: THREE.Vector3 = new THREE.Vector3(0, 0.4, 0);

  // Racing camera settings
  private cameraHeading: number = 0;  // smoothed heading for camera
  private targetHeight: number = 3.2;
  private targetDist: number = 7.0;
  private shake: number = 0;

  // The camera yaw is kept public so vehicle physics can read the "camera forward"
  // In racing mode, camera aligns to car heading, so yaw follows the car.
  public get yaw(): number {
    return this.cameraHeading;
  }

  // Speed-based FOV
  private currentFov: number = 52;
  private readonly baseFov: number = 52;
  private readonly maxFov: number = 68;

  constructor(camera: THREE.PerspectiveCamera, _domElement: HTMLElement) {
    this.camera = camera;
    // No mouse drag in racing mode — camera always follows car
  }

  /**
   * Set camera position to spawn point instantly (no lag on level load)
   */
  public snapTo(pos: THREE.Vector3, heading: number): void {
    this.cameraHeading = heading;
    this.currentLookAt.copy(pos).add(new THREE.Vector3(0, 0.8, 0));
    const cx = pos.x - Math.sin(heading) * this.targetDist;
    const cy = pos.y + this.targetHeight;
    const cz = pos.z - Math.cos(heading) * this.targetDist;
    this.camera.position.set(cx, cy, cz);
  }

  /**
   * triggerShake — call when landing hard
   */
  public triggerShake(intensity: number): void {
    this.shake = Math.min(1.0, intensity * 0.12);
  }

  public update(targetPos: THREE.Vector3, vehicleHeading: number, vehicleSpeed: number, dt: number): void {
    // 1. Smooth camera heading toward vehicle heading
    // Use shortest-angle interpolation
    let dHeading = vehicleHeading - this.cameraHeading;
    while (dHeading > Math.PI) dHeading -= Math.PI * 2;
    while (dHeading < -Math.PI) dHeading += Math.PI * 2;

    const headingLag = Math.min(1, dt * 4.0); // slower lag = more cinematic
    this.cameraHeading += dHeading * headingLag;

    // 2. Look-ahead offset (point slightly ahead of car)
    const lookAheadDist = vehicleSpeed * 0.12;
    const lookAheadX = Math.sin(vehicleHeading) * lookAheadDist;
    const lookAheadZ = Math.cos(vehicleHeading) * lookAheadDist;
    const desiredLookAt = new THREE.Vector3(
      targetPos.x + lookAheadX,
      targetPos.y + 0.8,
      targetPos.z + lookAheadZ
    );
    const followFactor = 1.0 - Math.exp(-10.0 * dt);
    this.currentLookAt.lerp(desiredLookAt, followFactor);

    // 3. Camera position: behind and above car
    const dist = this.targetDist;
    const height = this.targetHeight;
    const desiredCamPos = new THREE.Vector3(
      this.currentLookAt.x - Math.sin(this.cameraHeading) * dist,
      this.currentLookAt.y + height - 0.8, // subtract lookAt y-offset
      this.currentLookAt.z - Math.cos(this.cameraHeading) * dist
    );

    // Camera lag follows quickly but not instantly
    const camFactor = 1.0 - Math.exp(-8.0 * dt);
    this.camera.position.lerp(desiredCamPos, camFactor);

    // 4. Camera shake decay
    const shakeOffset = new THREE.Vector3(
      (Math.random() - 0.5) * this.shake * 0.35,
      (Math.random() - 0.5) * this.shake * 0.35,
      0
    );
    this.camera.position.add(shakeOffset);
    this.shake *= Math.pow(0.2, dt);
    if (this.shake < 0.005) this.shake = 0;

    // 5. Look at
    this.camera.lookAt(this.currentLookAt);

    // 6. Speed-based FOV
    const speedNorm = Math.min(1, vehicleSpeed / 14.0);
    const targetFov = this.baseFov + speedNorm * (this.maxFov - this.baseFov);
    this.currentFov += (targetFov - this.currentFov) * Math.min(1, dt * 3.0);
    this.camera.fov = this.currentFov;
    this.camera.updateProjectionMatrix();
  }
}
