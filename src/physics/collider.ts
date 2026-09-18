import * as THREE from 'three';

export interface AABBCollider {
  type: 'box';
  id: string;
  min: THREE.Vector3;
  max: THREE.Vector3;
  friction?: number;
  restitution?: number;
}

export interface MovingHazardCollider {
  type: 'hazard';
  id: string;
  position: THREE.Vector3;
  radius: number;
  height: number;
  damage: number;
}

export type BoostPadCollider = BouncePadCollider;

export interface BouncePadCollider {
  type: 'bounce_pad';
  id: string;
  position: THREE.Vector3;
  width: number;
  depth: number;
  launchImpulse: number;
}

export interface CrystalCollider {
  type: 'crystal';
  id: string;
  position: THREE.Vector3;
  radius: number;
  collected: boolean;
}

export interface CheckpointCollider {
  type: 'checkpoint';
  id: string;
  position: THREE.Vector3;
  radius: number;
  activated: boolean;
}

export interface GoalCollider {
  type: 'goal';
  id: string;
  position: THREE.Vector3;
  radius: number;
}

export interface CollisionResult {
  collided: boolean;
  contactPoint: THREE.Vector3;
  contactNormal: THREE.Vector3;
  penetration: number;
  restitution: number;
  friction: number;
}

export function testSphereAABB(
  sphereCenter: THREE.Vector3,
  radius: number,
  boxMin: THREE.Vector3,
  boxMax: THREE.Vector3,
  restitution = 0.35,
  friction = 0.55
): CollisionResult {
  const closest = new THREE.Vector3(
    Math.max(boxMin.x, Math.min(sphereCenter.x, boxMax.x)),
    Math.max(boxMin.y, Math.min(sphereCenter.y, boxMax.y)),
    Math.max(boxMin.z, Math.min(sphereCenter.z, boxMax.z))
  );

  const diff = sphereCenter.clone().sub(closest);
  const distSq = diff.lengthSq();

  if (distSq <= radius * radius && distSq > 1e-8) {
    const dist = Math.sqrt(distSq);
    const normal = diff.clone().multiplyScalar(1 / dist);
    const penetration = radius - dist;

    return {
      collided: true,
      contactPoint: closest,
      contactNormal: normal,
      penetration,
      restitution,
      friction,
    };
  } else if (distSq <= 1e-8) {
    // Sphere center inside the box; find minimal exit axis
    const dMinX = sphereCenter.x - boxMin.x;
    const dMaxX = boxMax.x - sphereCenter.x;
    const dMinY = sphereCenter.y - boxMin.y;
    const dMaxY = boxMax.y - sphereCenter.y;
    const dMinZ = sphereCenter.z - boxMin.z;
    const dMaxZ = boxMax.z - sphereCenter.z;

    const minDist = Math.min(dMinX, dMaxX, dMinY, dMaxY, dMinZ, dMaxZ);
    const normal = new THREE.Vector3(0, 1, 0);

    if (minDist === dMaxY) normal.set(0, 1, 0);
    else if (minDist === dMinY) normal.set(0, -1, 0);
    else if (minDist === dMaxX) normal.set(1, 0, 0);
    else if (minDist === dMinX) normal.set(-1, 0, 0);
    else if (minDist === dMaxZ) normal.set(0, 0, 1);
    else normal.set(0, 0, -1);

    return {
      collided: true,
      contactPoint: sphereCenter.clone().sub(normal.clone().multiplyScalar(radius)),
      contactNormal: normal,
      penetration: radius + minDist,
      restitution,
      friction,
    };
  }

  return {
    collided: false,
    contactPoint: closest,
    contactNormal: new THREE.Vector3(0, 1, 0),
    penetration: 0,
    restitution,
    friction,
  };
}
