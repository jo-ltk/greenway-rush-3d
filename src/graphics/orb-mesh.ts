import * as THREE from 'three';
import { OrbPhysics } from '../physics/orb-physics.ts';

export class OrbMesh {
  public group: THREE.Group;
  private outerMesh: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshPhysicalMaterial>;
  private innerCore: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;
  private coreLight: THREE.PointLight;

  private basePositions: Float32Array;
  private vertexCount: number;
  private tempVec: THREE.Vector3 = new THREE.Vector3();
  public radius: number;

  constructor(radius: number = 0.42) {
    this.radius = radius;
    this.group = new THREE.Group();

    // 1. Outer elastic shell with high detail
    const geom = new THREE.IcosahedronGeometry(radius, 4);
    this.vertexCount = geom.attributes.position.count;
    this.basePositions = new Float32Array(geom.attributes.position.array);

    const outerMat = new THREE.MeshPhysicalMaterial({
      color: 0x00f5d4,
      emissive: 0x003b36,
      emissiveIntensity: 0.6,
      roughness: 0.12,
      metalness: 0.1,
      transmission: 0.4,
      thickness: 0.6,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      wireframe: false,
    });

    this.outerMesh = new THREE.Mesh(geom, outerMat);
    this.outerMesh.castShadow = true;
    this.outerMesh.receiveShadow = false;
    this.group.add(this.outerMesh);

    // 2. Inner pulsating energy core
    const coreGeom = new THREE.SphereGeometry(radius * 0.45, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xff007f,
      emissive: 0xff00aa,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
    this.innerCore = new THREE.Mesh(coreGeom, coreMat);
    this.group.add(this.innerCore);

    // 3. Dynamic point light
    this.coreLight = new THREE.PointLight(0x00f5d4, 1.8, 6.0, 1.5);
    this.coreLight.castShadow = false;
    this.group.add(this.coreLight);
  }

  public update(physics: OrbPhysics, time: number): void {
    // 1. Sync group position
    this.group.position.copy(physics.position);

    // 2. Core rotation & pulsation
    const pulse = Math.sin(time * 6.0) * 0.08 + 1.0;
    this.innerCore.scale.set(pulse, pulse, pulse);
    this.innerCore.rotation.x = time * 2.0;
    this.innerCore.rotation.y = time * 2.5;

    // 3. Real-time soft-body vertex deformation (squash & stretch)
    const posAttr = this.outerMesh.geometry.attributes.position;
    const positions = posAttr.array as Float32Array;

    const defAmount = physics.deformationAmount; // Positive = squashed
    const defNorm = physics.deformationNormal; // Impact normal direction

    // Velocity stretching along trajectory
    const vel = physics.velocity;
    const speed = vel.length();
    const velDir = speed > 0.01 ? vel.clone().multiplyScalar(1 / speed) : new THREE.Vector3(0, 1, 0);
    const velStretch = Math.min(0.35, speed * 0.022); // Stretch factor

    // Volume preservation factor: if compressed by (1 - d), cross-section expands by sqrt(1/(1-d))
    const squashScale = 1.0 - defAmount;
    const safeSquash = Math.max(0.3, squashScale);
    const expandScale = Math.sqrt(1.0 / safeSquash);

    // We apply local deformation in object space
    // To do this simply, we deform each vertex relative to normal and velocity
    for (let i = 0; i < this.vertexCount; i++) {
      const idx = i * 3;
      const bx = this.basePositions[idx];
      const by = this.basePositions[idx + 1];
      const bz = this.basePositions[idx + 2];

      this.tempVec.set(bx, by, bz);

      if (Math.abs(defAmount) > 0.01) {
        // Component along deformation normal
        const normalComp = this.tempVec.dot(defNorm);
        const tangentComp = this.tempVec.clone().sub(defNorm.clone().multiplyScalar(normalComp));

        // Squash along normal, expand laterally
        const displacedNormal = normalComp * safeSquash;
        const displacedTangent = tangentComp.multiplyScalar(expandScale);

        this.tempVec.copy(defNorm).multiplyScalar(displacedNormal).add(displacedTangent);
      }

      if (speed > 1.5 && Math.abs(defAmount) < 0.15) {
        // High speed elongation along velocity
        const vComp = this.tempVec.dot(velDir);
        const lateralComp = this.tempVec.clone().sub(velDir.clone().multiplyScalar(vComp));

        const lateralCompress = 1.0 / Math.sqrt(1.0 + velStretch);
        this.tempVec.copy(velDir).multiplyScalar(vComp * (1.0 + velStretch)).add(lateralComp.multiplyScalar(lateralCompress));
      }

      positions[idx] = this.tempVec.x;
      positions[idx + 1] = this.tempVec.y;
      positions[idx + 2] = this.tempVec.z;
    }

    posAttr.needsUpdate = true;
    this.outerMesh.geometry.computeVertexNormals();

    // 4. Mesh rolling orientation from physics
    this.outerMesh.quaternion.copy(physics.orientation);
  }
}
