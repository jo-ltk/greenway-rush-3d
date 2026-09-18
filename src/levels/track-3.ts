import type { TrackData } from './types.ts';

// ─────────────────────────────────────────────────────────────────────────────
// TRACK 03 — GOLDEN RIDGE
// Hard track: fast straight road, narrowest lane, multiple moving obstacles,
// more boost pads. Fully flat, no elevation changes.
// Road top surface at Y = 0. Road slab: min Y = -0.5, max Y = 0.
// ─────────────────────────────────────────────────────────────────────────────
export const TRACK_3: TrackData = {
  id: 3,
  trackName: 'TRACK 03',
  trackTitle: 'Golden Ridge',
  difficulty: 'Hard',
  description: 'A blazing fast circuit with tight obstacles. Maximum speed required!',
  spawnPoint: [0, 0.45, -2],
  spawnHeading: 0,

  goldTime: 55,
  silverTime: 80,

  platforms: [
    // ── Continuous road slab ──
    // Narrow lane (6 units: X -3 to +3), Z: -8 to 170
    { min: [-3, -0.5, -8],  max: [3, 0, 170], surface: 'road' },

    // ── Dirt shoulders ──
    { min: [-5.5, -0.5, -8],  max: [-3, -0.02, 170], surface: 'dirt' },
    { min: [ 3,   -0.5, -8],  max: [ 5.5, -0.02, 170], surface: 'dirt' },

    // ── Guardrail walls ──
    { min: [-5.9, 0, -8],  max: [-5.5, 0.7, 170] },
    { min: [ 5.5, 0, -8],  max: [ 5.9, 0.7, 170] },
  ],

  obstacles: [
    {
      id: 'obs_1',
      pattern: 'oscillate_x',
      center: [0, 0.55, 28],
      range: 1.8,
      speed: 1.8,
      radius: 0.6,
      height: 1.0,
    },
    {
      id: 'obs_2',
      pattern: 'oscillate_x',
      center: [0, 0.55, 55],
      range: 2.0,
      speed: 2.2,
      radius: 0.65,
      height: 1.0,
    },
    {
      id: 'obs_3',
      pattern: 'oscillate_x',
      center: [0, 0.55, 82],
      range: 2.0,
      speed: 2.5,
      radius: 0.6,
      height: 1.0,
    },
    {
      id: 'obs_4',
      pattern: 'oscillate_x',
      center: [0, 0.55, 115],
      range: 2.2,
      speed: 2.8,
      radius: 0.55,
      height: 0.9,
    },
    {
      id: 'obs_5',
      pattern: 'oscillate_x',
      center: [0, 0.55, 145],
      range: 2.0,
      speed: 3.0,
      radius: 0.6,
      height: 1.0,
    },
  ],

  boostPads: [
    { id: 'bp_1', position: [0, 0.05,  40], width: 2.5, depth: 3.0, launchImpulse: 0 },
    { id: 'bp_2', position: [0, 0.05,  90], width: 2.5, depth: 3.0, launchImpulse: 0 },
    { id: 'bp_3', position: [0, 0.05, 140], width: 2.5, depth: 3.0, launchImpulse: 0 },
  ],

  tokens: [
    { id: 't_1',  position: [ 0,   0.7,  10] },
    { id: 't_2',  position: [ 1.2, 0.7,  20] },
    { id: 't_3',  position: [-1.2, 0.7,  32] },
    { id: 't_4',  position: [ 0,   0.7,  44] },
    { id: 't_5',  position: [ 1.2, 0.7,  56] },
    { id: 't_6',  position: [-1.2, 0.7,  68] },
    { id: 't_7',  position: [ 0,   0.7,  80] },
    { id: 't_8',  position: [ 1.2, 0.7,  92] },
    { id: 't_9',  position: [-1.2, 0.7, 104] },
    { id: 't_10', position: [ 0,   0.7, 116] },
    { id: 't_11', position: [ 1.2, 0.7, 128] },
    { id: 't_12', position: [-1.2, 0.7, 140] },
    { id: 't_13', position: [ 0,   0.7, 152] },
    { id: 't_14', position: [ 1.2, 0.7, 160] },
    { id: 't_15', position: [ 0,   0.7, 165] },
  ],

  checkpoints: [
    { id: 'cp_1', position: [0, 0.45,  30] },
    { id: 'cp_2', position: [0, 0.45,  65] },
    { id: 'cp_3', position: [0, 0.45, 100] },
    { id: 'cp_4', position: [0, 0.45, 135] },
    { id: 'cp_5', position: [0, 0.45, 160] },
  ],

  finishLine: {
    id: 'finish_3',
    position: [0, 0.45, 165],
  },
};
