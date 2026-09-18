import type { TrackData } from './types.ts';

// ─────────────────────────────────────────────────────────────────────────────
// TRACK 01 — SUNNY MEADOW
// Beginner track: wide straight road, gentle chicanes via guardrails,
// green grass, yellow flowers. Fully drivable with no elevation changes.
// Road top surface is at Y = 0. Road slab: min Y = -0.5, max Y = 0.
// ─────────────────────────────────────────────────────────────────────────────
export const TRACK_1: TrackData = {
  id: 1,
  trackName: 'TRACK 01',
  trackTitle: 'Sunny Meadow',
  difficulty: 'Easy',
  description: 'A bright meadow track with a wide straight road. Perfect for beginners!',
  spawnPoint: [0, 0.45, -2],
  spawnHeading: 0, // heading +Z

  goldTime: 38,
  silverTime: 55,

  platforms: [
    // ── Continuous road slab — one unbroken surface from start to finish ──
    // Width: 8 units (X: -4 to +4), runs Z: -8 to 120
    { min: [-4, -0.5, -8],  max: [4, 0, 120], surface: 'road' },

    // ── Guardrail walls (thin, above road top) ──
    { min: [-4.4, 0,   -8],  max: [-4, 0.7, 120] },  // left wall
    { min: [4,    0,   -8],  max: [4.4, 0.7, 120] },  // right wall
  ],

  obstacles: [],

  boostPads: [
    { id: 'bp_1', position: [0, 0.05, 30], width: 3.5, depth: 3.0, launchImpulse: 0 },
    { id: 'bp_2', position: [0, 0.05, 75], width: 3.5, depth: 3.0, launchImpulse: 0 },
  ],

  tokens: [
    { id: 't_1',  position: [ 0,   0.7,  8]  },
    { id: 't_2',  position: [ 1.5, 0.7, 16]  },
    { id: 't_3',  position: [-1.5, 0.7, 24]  },
    { id: 't_4',  position: [ 0,   0.7, 32]  },
    { id: 't_5',  position: [ 1.5, 0.7, 42]  },
    { id: 't_6',  position: [-1.5, 0.7, 52]  },
    { id: 't_7',  position: [ 0,   0.7, 62]  },
    { id: 't_8',  position: [ 1.5, 0.7, 72]  },
    { id: 't_9',  position: [-1.5, 0.7, 82]  },
    { id: 't_10', position: [ 0,   0.7, 92]  },
  ],

  checkpoints: [
    { id: 'cp_1', position: [0, 0.45, 30]  },
    { id: 'cp_2', position: [0, 0.45, 65]  },
    { id: 'cp_3', position: [0, 0.45, 100] },
  ],

  finishLine: {
    id: 'finish_1',
    position: [0, 0.45, 115],
  },
};
