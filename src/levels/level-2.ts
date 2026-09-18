import type { LevelData } from './types.ts';

export const LEVEL_2: LevelData = {
  id: 2,
  sectorName: 'SECTOR 02',
  title: 'HAZARD CONCOURSE',
  description: 'Navigate moving laser sweepers, rotating barriers, and precision platforms.',
  spawnPoint: [0, 1.2, 0],
  platforms: [
    // 1. Spawn base
    { min: [-3.5, -0.6, -3.5], max: [3.5, 0, 3.5], neonBorder: true },

    // 2. Hazard corridor 1 (sweeper crossing)
    { min: [-3.0, -0.6, 3.5], max: [3.0, 0, 16], neonBorder: true },

    // 3. Middle safe haven with checkpoint
    { min: [-4, -0.6, 16], max: [4, 0, 24], neonBorder: true },

    // 4. Narrow beam crossing (high precision roll)
    { min: [-1.2, -0.6, 24], max: [1.2, 0, 34], neonBorder: false },

    // 5. Spinner plaza
    { min: [-5, -0.6, 34], max: [5, 0, 44], neonBorder: true },

    // 6. Elevated goal landing
    { min: [-4, 3.2, 49], max: [4, 3.8, 59], neonBorder: true },
  ],
  hazards: [
    // Sweeper 1 in corridor 1 (oscillates X)
    {
      id: 'h_sweep_1',
      pattern: 'oscillate_x',
      center: [0, 0.5, 8],
      range: 2.2,
      speed: 2.8,
      radius: 0.35,
      height: 1.2,
    },
    // Sweeper 2 in corridor 1 (oscillates X, opposite phase)
    {
      id: 'h_sweep_2',
      pattern: 'oscillate_x',
      center: [0, 0.5, 12],
      range: 2.2,
      speed: -3.2,
      radius: 0.35,
      height: 1.2,
    },
    // Spinner in the second plaza (rotates around center)
    {
      id: 'h_spinner_1',
      pattern: 'rotate_y',
      center: [0, 0.6, 39],
      range: 3.2,
      speed: 2.2,
      radius: 0.45,
      height: 1.4,
    },
  ],
  bouncePads: [
    // Launches from Spinner Plaza to elevated goal platform
    { id: 'bp_2_1', position: [0, 0.05, 43.5], width: 2.2, depth: 2.2, launchImpulse: 15.0 },
  ],
  crystals: [
    { id: 'c_2_1', position: [0, 0.9, 5] },
    { id: 'c_2_2', position: [0, 0.9, 10] },
    { id: 'c_2_3', position: [-2.5, 0.9, 20] },
    { id: 'c_2_4', position: [2.5, 0.9, 20] },
    { id: 'c_2_5', position: [0, 0.9, 29] },
    { id: 'c_2_6', position: [0, 0.9, 39] },
    { id: 'c_2_7', position: [0, 4.7, 53] },
  ],
  checkpoints: [
    { id: 'cp_2_1', position: [0, 0.1, 18] },
  ],
  goal: {
    id: 'goal_2',
    position: [0, 4.8, 56],
  },
};
