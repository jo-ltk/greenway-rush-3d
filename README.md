# ORBITAL PULSE: Kinetic Labs

An original 3D physics platformer built with Three.js and TypeScript.

Control the **Pulse Orb** — a soft-matter kinetic energy sphere with real-time elastic vertex deformation. Navigate high-tech test chambers, collect energy crystals, leap across dynamic launch pads, dodge moving laser barriers, synchronize checkpoints, and activate quantum goal portals.

---

## Game Features

- **Soft-Body Ball Physics**: Real-time momentum, surface friction, air drag, elastic squash-and-stretch vertex deformation with Poisson volume preservation, and damped harmonic spring oscillations.
- **Responsive Controls**: Full keyboard (WASD/Arrows + Space to bounce), mouse orbital camera tracking, and on-screen mobile virtual joystick/jump controls.
- **Three Progressive Sectors**:
  - **Sector 01: Calibration Zone** — Introductory momentum courses, gentle ramps, energy crystals, and launch pads.
  - **Sector 02: Hazard Concourse** — Oscillating laser beams, rotating barriers, narrow elevated bridges, and intermediate checkpoints.
  - **Sector 03: Quantum Spire** — Multi-tiered vertical ascent, moving gap crossings, precision bounce pads, and the quantum resonance gate.
- **Procedural Web Audio Engine**: Zero external audio dependencies. Dynamic rolling hum modulated by velocity, soft squish/bounce synthesis, harmonic collectible chimes, launch pad booms, and victory fanfares.
- **Modern Stylized Cyberpunk Aesthetics**: Sleek dark slate platforms, glowing neon borders, glowing energy cores, particle spark trails, impact rings, and holographic portals.
- **Full HUD & Menu System**: Title screen, sector selection, real-time stopwatch timer, energy crystal tracker, score counter, checkpoint toasts, pause menu, and victory modals.

---

## Controls

| Action | Desktop Controls | Mobile / Touch Controls |
| :--- | :--- | :--- |
| **Roll / Move** | `W` `A` `S` `D` or `Arrow Keys` | Virtual Analog Joystick |
| **Elastic Bounce** | `Space` | On-screen `BOUNCE` Button |
| **Orbit Camera** | Left-Click & Drag / Touch Drag | Touch Screen Swipe |
| **Zoom Camera** | Mouse Scroll Wheel / Pinch | Pinch gesture |
| **Respawn at Checkpoint** | `R` or Quick Action Button | Quick Action Button |
| **Pause / Menu** | `Esc` or `P` or Pause Button | Pause Button |
| **Mute / Unmute** | Audio Button | Audio Button |

---

## Development & Build

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Type check with strict TypeScript
npm run typecheck

# Lint with ESLint
npm run lint

# Build production bundle
npm run build

# Preview production build
npm run preview
```

---

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0-only).
See the [LICENSE](./LICENSE) file for the full license terms.

Derived from foundational open-source WebGL/Three.js engineering references while featuring completely original game mechanics, character identity, procedural audio, levels, shaders, materials, and user interface.