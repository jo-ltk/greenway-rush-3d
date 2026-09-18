import type { TrackData } from './types.ts';

// ─────────────────────────────────────────────────────────────────────────────
// TRACK 02 — FOREST SPRINT
// Intermediate track: straight road, narrower lane, moving obstacles,
// denser tree scenery, mud-edged road. Fully flat, no elevation changes.
// Road top surface at Y = 0. Road slab: min Y = -0.5, max Y = 0.
// ─────────────────────────────────────────────────────────────────────────────
export const TRACK_2: TrackData = {
  id: 2,
  trackName: 'TRACK 02',
  trackTitle: 'Forest Sprint',
  difficulty: 'Medium',
  description: 'A fast forest road with tight guardrails and moving obstacles. Stay sharp!',
  spawnPoint: [0, 0.45, -2],
  spawnHeading: 0,

  goldTime: 42,
  silverTime: 65,

  platforms: [
    // ── Continuous road slab ──
    // Slightly narrower than Track 1 (7 units: X -3.5 to +3.5), Z: -8 to 140
    { min: [-3.5, -0.5, -8],  max: [3.5, 0, 140], surface: 'road' },

    // ── Dirt shoulders (visual variety, same level — no collision step) ──
    { min: [-5.5, -0.5, -8],  max: [-3.5, -0.02, 140], surface: 'dirt'  },
    { min: [ 3.5, -0.5, -8],  max: [ 5.5, -0.02, 140], surface: 'dirt'  },

    // ── Guardrail walls ──
    { min: [-5.9, 0, -8],  max: [-5.5, 0.7, 140] },  // left wall
    { min: [ 5.5, 0, -8],  max: [ 5.9, 0.7, 140] },  // right wall
  ],

  obstacles: [
    {
      id: 'obs_1',
      pattern: 'oscillate_x',
      center: [0, 0.55, 35],
      range: 2.0,
      speed: 1.4,
      radius: 0.65,
      height: 1.0,
    },
    {
      id: 'obs_2',
      pattern: 'oscillate_x',
      center: [0, 0.55, 70],
      range: 2.2,
      speed: 1.8,
      radius: 0.6,
      height: 1.0,
    },
    {
      id: 'obs_3',
      pattern: 'oscillate_x',
      center: [0, 0.55, 105],
      range: 2.5,
      speed: 2.2,
      radius: 0.55,
      height: 0.9,
    },
  ],

  boostPads: [
    { id: 'bp_1', position: [0, 0.05,  50], width: 3.0, depth: 3.0, launchImpulse: 0 },
    { id: 'bp_2', position: [0, 0.05, 110], width: 3.0, depth: 3.0, launchImpulse: 0 },
  ],

  tokens: [
    { id: 't_1',  position: [ 0,   0.7,  8]  },
    { id: 't_2',  position: [ 1.5, 0.7, 18]  },
    { id: 't_3',  position: [-1.5, 0.7, 28]  },
    { id: 't_4',  position: [ 0,   0.7, 38]  },
    { id: 't_5',  position: [ 1.5, 0.7, 50]  },
    { id: 't_6',  position: [-1.5, 0.7, 62]  },
    { id: 't_7',  position: [ 0,   0.7, 74]  },
    { id: 't_8',  position: [ 1.5, 0.7, 86]  },
    { id: 't_9',  position: [-1.5, 0.7, 98]  },
    { id: 't_10', position: [ 0,   0.7, 110] },
    { id: 't_11', position: [ 1.5, 0.7, 122] },
    { id: 't_12', position: [ 0,   0.7, 132] },
  ],

  checkpoints: [
    { id: 'cp_1', position: [0, 0.45,  35]  },
    { id: 'cp_2', position: [0, 0.45,  72]  },
    { id: 'cp_3', position: [0, 0.45, 108]  },
    { id: 'cp_4', position: [0, 0.45, 130]  },
  ],

  finishLine: {
    id: 'finish_2',
    position: [0, 0.45, 136],
  },
};
