import * as THREE from 'three';

export function createRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
  });

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);

  return renderer;
}

export function handleResize(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera
): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
  renderer.setPixelRatio(dpr);
  renderer.setSize(width, height);
}
