import './style.css';
import { startGame, GameRuntime, type GameState } from './app/runtime.ts';

const appEl = document.querySelector<HTMLDivElement>('#app')!;

appEl.innerHTML = `
  <div id="viewport"></div>

  <!-- ═══════════════════════════════════════════ IN-GAME HUD ══ -->
  <div id="hud" class="hud-layer hidden">
    <header class="hud-top-bar">
      <!-- Track info (top-left) -->
      <div class="track-badge">
        <span id="hud-track-num" class="track-num">TRACK 01</span>
        <span id="hud-track-title" class="track-title">Sunny Meadow</span>
      </div>

      <!-- Stats (top-center) -->
      <div class="hud-stats-center">
        <div class="stat-chip">
          <span class="stat-icon">🪙</span>
          <span id="hud-tokens" class="stat-val">0 / 10</span>
        </div>
        <div class="stat-chip">
          <span class="stat-icon">⏱</span>
          <span id="hud-timer" class="stat-val mono">00:00.0</span>
        </div>
        <div class="stat-chip best-chip">
          <span class="stat-icon">🏆</span>
          <span id="hud-best" class="stat-val mono">--:--.--</span>
        </div>
      </div>

      <!-- Buttons (top-right) -->
      <div class="action-buttons">
        <button id="btn-mute" class="icon-btn" title="Toggle Sound" aria-label="Toggle Sound">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path id="sound-waves" d="M15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13"/></svg>
        </button>
        <button id="btn-reset" class="icon-btn" title="Respawn (R)" aria-label="Respawn">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </button>
        <button id="btn-pause" class="icon-btn" title="Pause (Esc)" aria-label="Pause">
          <svg viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        </button>
      </div>
    </header>

    <!-- Speedometer (bottom-left) -->
    <div class="speedometer">
      <span id="hud-speed" class="speed-number">0</span>
      <span class="speed-unit">km/h</span>
    </div>

    <!-- Boost flash overlay -->
    <div id="boost-flash" class="boost-flash"></div>

    <!-- Checkpoint toast -->
    <div id="checkpoint-toast" class="checkpoint-toast">
      <span>✓</span>
      <span>CHECKPOINT!</span>
    </div>

    <!-- Respawn toast -->
    <div id="respawn-toast" class="respawn-toast">
      <span>⚠ RESPAWNING...</span>
    </div>

    <!-- Controls hint (bottom-center) -->
    <footer class="controls-hint">
      <div class="hint-group"><kbd>W</kbd><kbd>S</kbd><span class="hint-label">Gas / Reverse</span></div>
      <span class="hint-sep"></span>
      <div class="hint-group"><kbd>A</kbd><kbd>D</kbd><span class="hint-label">Steer</span></div>
      <span class="hint-sep"></span>
      <div class="hint-group"><kbd>SPACE</kbd><span class="hint-label">Brake</span></div>
      <span class="hint-sep"></span>
      <div class="hint-group"><kbd>R</kbd><span class="hint-label">Respawn</span></div>
    </footer>
  </div>

  <!-- ═══════════════════════════════════ COUNTDOWN OVERLAY ══ -->
  <div id="overlay-countdown" class="countdown-overlay hidden">
    <div id="countdown-number" class="countdown-number">3</div>
  </div>

  <!-- ═══════════════════════════════════ TOUCH CONTROLS ══ -->
  <div class="touch-controls">
    <button class="joystick" data-joystick type="button" aria-label="Steer">
      <span class="joystick-track"></span>
      <span class="joystick-knob"></span>
    </button>
    <button class="brake-btn" data-control="Space" type="button" aria-label="Brake">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2.5"><path d="M19 12H5"/><path d="M12 5l-7 7 7 7"/></svg>
      <span>BRAKE</span>
    </button>
  </div>

  <!-- ═══════════════════════════════════════════ MAIN MENU ══ -->
  <div id="modal-menu" class="modal-backdrop active">
    <div class="menu-card">
      <!-- Racing logo -->
      <div class="brand-logo">
        <div class="logo-car">🏎️</div>
      </div>
      <h1 class="game-title">GREENWAY<br><span class="title-accent">RUSH</span></h1>
      <p class="menu-tagline">Pick your track and start the race!</p>

      <!-- Track selector -->
      <div class="track-selector">
        <button class="track-card active" data-level="0" id="track-btn-0">
          <span class="track-card-icon">🌻</span>
          <div class="track-card-info">
            <span class="track-card-name">Sunny Meadow</span>
            <span class="track-card-diff easy">Easy</span>
          </div>
        </button>
        <button class="track-card" data-level="1" id="track-btn-1">
          <span class="track-card-icon">🌲</span>
          <div class="track-card-info">
            <span class="track-card-name">Forest Sprint</span>
            <span class="track-card-diff medium">Medium</span>
          </div>
        </button>
        <button class="track-card" data-level="2" id="track-btn-2">
          <span class="track-card-icon">🏔️</span>
          <div class="track-card-info">
            <span class="track-card-name">Golden Ridge</span>
            <span class="track-card-diff hard">Hard</span>
          </div>
        </button>
      </div>

      <button id="btn-start" class="btn-primary btn-green">🚀 START RACE</button>

      <details class="how-to-play">
        <summary>How to Play</summary>
        <ul class="controls-list">
          <li><kbd>W / S</kbd> Accelerate / Reverse</li>
          <li><kbd>A / D</kbd> Steer left / right</li>
          <li><kbd>SPACE</kbd> Brake / handbrake drift</li>
          <li><kbd>R</kbd> Respawn at checkpoint</li>
          <li>🟡 Collect yellow tokens for bonus score</li>
          <li>🟠 Hit orange boost pads for speed boost!</li>
          <li>🏁 Reach the finish line as fast as you can!</li>
        </ul>
      </details>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════ PAUSE MODAL ══ -->
  <div id="modal-pause" class="modal-backdrop">
    <div class="menu-card compact">
      <h2 class="card-title">⏸ PAUSED</h2>
      <button id="btn-resume" class="btn-primary btn-green">▶ Resume</button>
      <button id="btn-restart-level" class="btn-secondary">↺ Restart Track</button>
      <button id="btn-pause-menu" class="btn-secondary">🏠 Main Menu</button>
    </div>
  </div>

  <!-- ══════════════════════════════════ LEVEL COMPLETE MODAL ══ -->
  <div id="modal-complete" class="modal-backdrop">
    <div class="menu-card">
      <div id="complete-medal" class="medal gold">🥇</div>
      <h2 class="card-title">TRACK COMPLETE!</h2>
      <div class="result-grid">
        <div class="result-card">
          <span class="result-label">Your Time</span>
          <span id="complete-time" class="result-val mono">00:00.0</span>
        </div>
        <div class="result-card">
          <span class="result-label">Tokens</span>
          <span id="complete-tokens" class="result-val">0 / 0</span>
        </div>
        <div class="result-card">
          <span class="result-label">Best Time</span>
          <span id="complete-best" class="result-val mono">--:--.--</span>
        </div>
        <div class="result-card">
          <span class="result-label">Gold Target</span>
          <span id="complete-gold" class="result-val gold-text mono">--:--.--</span>
        </div>
      </div>
      <button id="btn-next-level" class="btn-primary btn-green">Next Track ▶</button>
      <button id="btn-complete-menu" class="btn-secondary">🏠 Main Menu</button>
    </div>
  </div>

  <!-- ══════════════════════════════════════════ GAME WON MODAL ══ -->
  <div id="modal-victory" class="modal-backdrop">
    <div class="menu-card">
      <div class="medal gold big">🏆</div>
      <h2 class="card-title">ALL TRACKS COMPLETE!</h2>
      <p class="menu-tagline">Amazing racing! You conquered all three tracks!</p>
      <div class="result-grid">
        <div class="result-card">
          <span class="result-label">Total Time</span>
          <span id="victory-time" class="result-val mono">00:00.0</span>
        </div>
        <div class="result-card">
          <span class="result-label">Tokens</span>
          <span id="victory-tokens" class="result-val">0</span>
        </div>
      </div>
      <button id="btn-replay" class="btn-primary btn-green">🔄 Play Again</button>
    </div>
  </div>
`;

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const hudEl = document.querySelector<HTMLDivElement>('#hud')!;
const trackNumEl = document.querySelector<HTMLSpanElement>('#hud-track-num')!;
const trackTitleEl = document.querySelector<HTMLSpanElement>('#hud-track-title')!;
const tokensEl = document.querySelector<HTMLSpanElement>('#hud-tokens')!;
const timerEl = document.querySelector<HTMLSpanElement>('#hud-timer')!;
const bestEl = document.querySelector<HTMLSpanElement>('#hud-best')!;
const speedEl = document.querySelector<HTMLSpanElement>('#hud-speed')!;
const boostFlash = document.querySelector<HTMLDivElement>('#boost-flash')!;
const checkpointToast = document.querySelector<HTMLDivElement>('#checkpoint-toast')!;
const respawnToast = document.querySelector<HTMLDivElement>('#respawn-toast')!;
const countdownOverlay = document.querySelector<HTMLDivElement>('#overlay-countdown')!;
const countdownNumber = document.querySelector<HTMLDivElement>('#countdown-number')!;

const modalMenu = document.querySelector<HTMLDivElement>('#modal-menu')!;
const modalPause = document.querySelector<HTMLDivElement>('#modal-pause')!;
const modalComplete = document.querySelector<HTMLDivElement>('#modal-complete')!;
const modalVictory = document.querySelector<HTMLDivElement>('#modal-victory')!;

const btnStart = document.querySelector<HTMLButtonElement>('#btn-start')!;
const btnResume = document.querySelector<HTMLButtonElement>('#btn-resume')!;
const btnRestartLevel = document.querySelector<HTMLButtonElement>('#btn-restart-level')!;
const btnPauseMenu = document.querySelector<HTMLButtonElement>('#btn-pause-menu')!;
const btnNextLevel = document.querySelector<HTMLButtonElement>('#btn-next-level')!;
const btnCompleteMenu = document.querySelector<HTMLButtonElement>('#btn-complete-menu')!;
const btnReplay = document.querySelector<HTMLButtonElement>('#btn-replay')!;
const btnMute = document.querySelector<HTMLButtonElement>('#btn-mute')!;
const btnReset = document.querySelector<HTMLButtonElement>('#btn-reset')!;
const btnPause = document.querySelector<HTMLButtonElement>('#btn-pause')!;
const trackBtns = document.querySelectorAll<HTMLButtonElement>('.track-card');

let selectedLevel = 0;
let toastTimeout: number | null = null;
let respawnTimeout: number | null = null;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

function getMedalForTime(time: number, goldTime: number, silverTime: number): { emoji: string; cls: string } {
  if (time <= goldTime) return { emoji: '🥇', cls: 'gold' };
  if (time <= silverTime) return { emoji: '🥈', cls: 'silver' };
  return { emoji: '🥉', cls: 'bronze' };
}

// ─── Initialize Game ──────────────────────────────────────────────────────────
let game: GameRuntime | null = null;

game = startGame(document.querySelector<HTMLElement>('#viewport')!, {
  onTokenUpdate: (collected, total) => {
    tokensEl.textContent = `${collected} / ${total}`;
  },
  onTimeUpdate: (sec) => {
    timerEl.textContent = formatTime(sec);
  },
  onSpeedUpdate: (kmh) => {
    speedEl.textContent = String(Math.round(kmh));
  },
  onBestTimeUpdate: (secs) => {
    bestEl.textContent = secs !== null ? formatTime(secs) : '--:--.--';
  },
  onTrackLoaded: (idx, trackName, title, _diff) => {
    selectedLevel = idx;
    trackNumEl.textContent = trackName;
    trackTitleEl.textContent = title;
    trackBtns.forEach((btn, bIdx) => {
      btn.classList.toggle('active', bIdx === idx);
    });
  },
  onCheckpointTriggered: () => {
    if (toastTimeout !== null) clearTimeout(toastTimeout);
    checkpointToast.classList.add('active');
    toastTimeout = window.setTimeout(() => {
      checkpointToast.classList.remove('active');
      toastTimeout = null;
    }, 2200);
  },
  onCountdown: (n) => {
    countdownOverlay.classList.remove('hidden');
    if (n > 0) {
      countdownNumber.textContent = String(n);
      countdownNumber.className = 'countdown-number';
      void countdownNumber.offsetWidth; // reflow
      countdownNumber.classList.add('pop');
    } else {
      countdownNumber.textContent = 'GO!';
      countdownNumber.className = 'countdown-number go';
      void countdownNumber.offsetWidth;
      countdownNumber.classList.add('pop');
      window.setTimeout(() => {
        countdownOverlay.classList.add('hidden');
      }, 800);
    }
  },
  onLevelComplete: (stats) => {
    const medal = getMedalForTime(stats.time, stats.goldTime, stats.silverTime);
    const medalEl = document.querySelector<HTMLDivElement>('#complete-medal')!;
    medalEl.textContent = medal.emoji;
    medalEl.className = `medal ${medal.cls}`;
    document.querySelector<HTMLSpanElement>('#complete-time')!.textContent = formatTime(stats.time);
    document.querySelector<HTMLSpanElement>('#complete-tokens')!.textContent = `${stats.tokens} / ${stats.totalTokens}`;
    document.querySelector<HTMLSpanElement>('#complete-best')!.textContent = stats.bestTime !== null ? formatTime(stats.bestTime) : '--:--.--';
    document.querySelector<HTMLSpanElement>('#complete-gold')!.textContent = formatTime(stats.goldTime);
    modalComplete.classList.add('active');
  },
  onGameWon: (stats) => {
    document.querySelector<HTMLSpanElement>('#victory-time')!.textContent = formatTime(stats.totalTime);
    document.querySelector<HTMLSpanElement>('#victory-tokens')!.textContent = String(stats.totalTokens);
    modalVictory.classList.add('active');
  },
  onBoostActive: (active) => {
    if (active) {
      boostFlash.classList.add('active');
      window.setTimeout(() => boostFlash.classList.remove('active'), 600);
    }
  },
  onRespawn: () => {
    if (respawnTimeout !== null) clearTimeout(respawnTimeout);
    respawnToast.classList.add('active');
    respawnTimeout = window.setTimeout(() => {
      respawnToast.classList.remove('active');
      respawnTimeout = null;
    }, 1500);
  },
  onStateChange: (state: GameState) => {
    hudEl.classList.toggle('hidden', state === 'MENU');
    countdownOverlay.classList.toggle('hidden', state !== 'COUNTDOWN');
    modalMenu.classList.toggle('active', state === 'MENU');
    modalPause.classList.toggle('active', state === 'PAUSED');
    modalComplete.classList.toggle('active', state === 'LEVEL_COMPLETE');
    modalVictory.classList.toggle('active', state === 'GAME_WON');
  },
});

// ─── Track selector ───────────────────────────────────────────────────────────
trackBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const lvl = parseInt(btn.dataset.level || '0', 10);
    selectedLevel = lvl;
    trackBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    game?.loadLevel(lvl);
  });
});

// ─── Button actions ───────────────────────────────────────────────────────────
btnStart.addEventListener('click', () => {
  game?.loadLevel(selectedLevel);
  game?.startPlay();
});

btnResume.addEventListener('click', () => {
  game?.resumeGame();
});

btnRestartLevel.addEventListener('click', () => {
  modalPause.classList.remove('active');
  game?.restartCurrentLevel();
});

btnPauseMenu.addEventListener('click', () => {
  modalPause.classList.remove('active');
  game?.setState('MENU');
});

btnNextLevel.addEventListener('click', () => {
  modalComplete.classList.remove('active');
  game?.nextLevel();
});

btnCompleteMenu.addEventListener('click', () => {
  modalComplete.classList.remove('active');
  game?.setState('MENU');
});

btnReplay.addEventListener('click', () => {
  modalVictory.classList.remove('active');
  selectedLevel = 0;
  game?.loadLevel(0);
  game?.startPlay();
});

btnMute.addEventListener('click', () => {
  if (!game) return;
  const muted = game.sound.toggleMute();
  const waves = document.querySelector('#sound-waves');
  if (waves) (waves as SVGPathElement).style.display = muted ? 'none' : 'block';
});

btnReset.addEventListener('click', () => {
  if (game && game.state === 'PLAYING') {
    game.physics.reset(game.physics.lastSafePosition, game.physics.lastSafeHeading);
  }
});

btnPause.addEventListener('click', () => {
  if (!game) return;
  if (game.state === 'PLAYING') game.pauseGame();
  else if (game.state === 'PAUSED') game.resumeGame();
});
