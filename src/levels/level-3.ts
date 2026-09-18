import type { LevelData } from './types.ts';

export const LEVEL_3: LevelData = {
  id: 3,
  sectorName: 'SECTOR 03',
  title: 'QUANTUM SPIRE',
  description: 'Master multi-tiered vertical ascents, laser barriers, and leap across moving gaps.',
  spawnPoint: [0, 1.2, 0],
  platforms: [
    // 1. Spire base platform
    { min: [-4, -0.6, -4], max: [4, 0, 4], neonBorder: true },

    // 2. First tier walkway with hazards
    { min: [-2.5, -0.6, 4], max: [2.5, 0, 15], neonBorder: true },

    // 3. Platform tier 2 (height 3.5)
    { min: [-4.5, 2.9, 18], max: [4.5, 3.5, 27], neonBorder: true },

    // 4. Stepping islands between tier 2 and tier 3
    { min: [-2.0, 4.4, 30], max: [2.0, 5.0, 35], neonBorder: true },
    { min: [-2.0, 6.4, 38], max: [2.0, 7.0, 43], neonBorder: true },

    // 5. High Spire Summit (height 9.0)
    { min: [-5, 8.4, 46], max: [5, 9.0, 58], neonBorder: true },

    // 6. Floating Apex Sanctuary
    { min: [-3.5, 11.4, 62], max: [3.5, 12.0, 70], neonBorder: true },
  ],
  hazards: [
    // Fast sweeper 1 at base walkway
    {
      id: 'h3_sweep_1',
      pattern: 'oscillate_x',
      center: [0, 0.5, 9],
      range: 2.0,
      speed: 3.5,
      radius: 0.38,
      height: 1.2,
    },
    // Sweeper 2 on tier 2 platform
    {
      id: 'h3_sweep_2',
      pattern: 'oscillate_x',
      center: [0, 4.0, 22.5],
      range: 3.2,
      speed: -3.8,
      radius: 0.38,
      height: 1.2,
    },
    // Spinner hazard on high spire summit
    {
      id: 'h3_spinner_1',
      pattern: 'rotate_y',
      center: [0, 9.6, 52],
      range: 3.8,
      speed: 3.0,
      radius: 0.48,
      height: 1.6,
    },
  ],
  bouncePads: [
    // Boost from base to tier 2
    { id: 'bp3_1', position: [0, 0.05, 14.5], width: 2.2, depth: 2.2, launchImpulse: 15.0 },
    // Boost from tier 2 to island 1
    { id: 'bp3_2', position: [0, 3.55, 26.5], width: 2.0, depth: 2.0, launchImpulse: 13.5 },
    // Boost from summit to Floating Apex
    { id: 'bp3_3', position: [0, 9.05, 57.5], width: 2.4, depth: 2.4, launchImpulse: 15.8 },
  ],
  crystals: [
    { id: 'c3_1', position: [0, 0.9, 4.5] },
    { id: 'c3_2', position: [-2.5, 4.4, 20] },
    { id: 'c3_3', position: [2.5, 4.4, 20] },
    { id: 'c3_4', position: [0, 5.9, 32.5] },
    { id: 'c3_5', position: [0, 7.9, 40.5] },
    { id: 'c3_6', position: [-3.2, 9.9, 52] },
    { id: 'c3_7', position: [3.2, 9.9, 52] },
    { id: 'c3_8', position: [0, 12.9, 66] },
  ],
  checkpoints: [
    { id: 'cp3_1', position: [0, 3.6, 19] },
    { id: 'cp3_2', position: [0, 9.1, 48] },
  ],
  goal: {
    id: 'goal_3',
    position: [0, 13.0, 67],
  },
};
