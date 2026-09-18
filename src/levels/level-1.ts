import type { LevelData } from './types.ts';

export const LEVEL_1: LevelData = {
  id: 1,
  sectorName: 'SECTOR 01',
  title: 'CALIBRATION ZONE',
  description: 'Familiarize with rolling momentum, jumping, and energy crystal collection.',
  spawnPoint: [0, 1.2, 0],
  platforms: [
    // 1. Spawn chamber platform
    { min: [-4, -0.6, -4], max: [4, 0, 4], neonBorder: true },

    // 2. Connecting walkway
    { min: [-1.8, -0.6, 4], max: [1.8, 0, 12], neonBorder: false },

    // 3. Middle plaza with crystal cluster
    { min: [-5, -0.6, 12], max: [5, 0, 20], neonBorder: true },

    // 4. Elevated platform reachable via bounce pad
    { min: [-3.5, 2.4, 25], max: [3.5, 3.0, 33], neonBorder: true },

    // 5. Final exit terrace
    { min: [-4.5, 2.4, 37], max: [4.5, 3.0, 47], neonBorder: true },
    // Side guardrails on exit terrace
    { min: [-4.7, 3.0, 37], max: [-4.3, 3.8, 47], color: 0x1e293b },
    { min: [4.3, 3.0, 37], max: [4.7, 3.8, 47], color: 0x1e293b },
  ],
  hazards: [],
  bouncePads: [
    // Launches from Middle Plaza to the elevated platform
    { id: 'bp_1', position: [0, 0.05, 19.5], width: 2.4, depth: 2.4, launchImpulse: 14.5 },
    // Launches from elevated platform to exit terrace
    { id: 'bp_2', position: [0, 3.05, 32.5], width: 2.2, depth: 2.2, launchImpulse: 12.0 },
  ],
  crystals: [
    { id: 'c_1', position: [0, 0.9, 3] },
    { id: 'c_2', position: [-2.5, 0.9, 14] },
    { id: 'c_3', position: [2.5, 0.9, 14] },
    { id: 'c_4', position: [0, 0.9, 16.5] },
    { id: 'c_5', position: [0, 3.9, 29] },
  ],
  checkpoints: [
    { id: 'cp_1', position: [0, 0.1, 13] },
  ],
  goal: {
    id: 'goal_1',
    position: [0, 4.0, 44],
  },
};
