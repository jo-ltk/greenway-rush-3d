import * as THREE from 'three';

export class InputManager {
  public moveVector: THREE.Vector2 = new THREE.Vector2(0, 0);
  public jumpRequested: boolean = false;
  public resetRequested: boolean = false;
  public pauseRequested: boolean = false;
  public isBrakeHeld: boolean = false;
  public isNitroActive: boolean = false;

  private keysDown: Set<string> = new Set();
  private touchMoveVector: THREE.Vector2 = new THREE.Vector2(0, 0);
  private touchBrakeActive: boolean = false;
  private touchReverseActive: boolean = false;
  private touchNitroActive: boolean = false;

  constructor() {
    this.bindKeyboard();
    // Touch controls are bound later via initTouchControls(),
    // called from main.ts after the HTML has been injected into the DOM.
  }

  // ─── Called once the DOM is ready ─────────────────────────────────────────
  public initTouchControls(): void {
    this.bindJoystick();
    this.bindActionButtons();
  }

  // ─── Keyboard ─────────────────────────────────────────────────────────────
  private bindKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const code = e.code;
      this.keysDown.add(code);

      if (code === 'Space') {
        this.updateBrake();
        this.jumpRequested = true;
        e.preventDefault();
      }
      if (code === 'KeyR') this.resetRequested = true;
      if (code === 'KeyP' || code === 'Escape') this.pauseRequested = true;
      if (code === 'KeyN') this.isNitroActive = true;

      this.updateMovement();
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
      if (e.code === 'Space') this.updateBrake();
      if (e.code === 'KeyN') this.isNitroActive = this.touchNitroActive;
      this.updateMovement();
    });

    window.addEventListener('blur', () => {
      this.keysDown.clear();
      this.touchBrakeActive = false;
      this.touchReverseActive = false;
      this.touchNitroActive = false;
      this.isNitroActive = false;
      this.isBrakeHeld = false;
      this.moveVector.set(0, 0);
      this.touchMoveVector.set(0, 0);
    });
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────
  private updateMovement(): void {
    let x = 0;
    let y = 0;

    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft'))  x -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) x += 1;
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp'))    y += 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown'))  y -= 1;

    // Touch joystick + reverse-brake button
    x += this.touchMoveVector.x;
    y += this.touchMoveVector.y;
    if (this.touchReverseActive) y -= 1;

    this.moveVector.set(x, y);
    if (this.moveVector.lengthSq() > 1.0) this.moveVector.normalize();
  }

  private updateBrake(): void {
    this.isBrakeHeld = this.keysDown.has('Space') || this.touchBrakeActive;
  }

  // ─── Public touch API ──────────────────────────────────────────────────────
  public setTouchMove(x: number, y: number): void {
    this.touchMoveVector.set(x, y);
    this.updateMovement();
  }

  public triggerTouchJump(): void {
    this.jumpRequested = true;
  }

  public consumeJump(): boolean {
    const j = this.jumpRequested;
    this.jumpRequested = false;
    return j;
  }

  public consumeReset(): boolean {
    const r = this.resetRequested;
    this.resetRequested = false;
    return r;
  }

  public consumePause(): boolean {
    const p = this.pauseRequested;
    this.pauseRequested = false;
    return p;
  }

  // ─── Touch joystick (left stick) ──────────────────────────────────────────
  private bindJoystick(): void {
    const joystickEl = document.querySelector<HTMLButtonElement>('[data-joystick]');
    const knobEl     = document.querySelector<HTMLSpanElement>('.joystick-knob');
    if (!joystickEl || !knobEl) {
      console.warn('[Input] Joystick element not found in DOM');
      return;
    }

    let activeTouchId: number | null = null;
    let startX = 0;
    let startY = 0;
    const maxRadius = 38;

    const handleStart = (clientX: number, clientY: number, id: number) => {
      activeTouchId = id;
      const rect = joystickEl.getBoundingClientRect();
      startX = rect.left + rect.width  / 2;
      startY = rect.top  + rect.height / 2;
      handleMove(clientX, clientY);
    };

    const handleMove = (clientX: number, clientY: number) => {
      const dx   = clientX - startX;
      const dy   = clientY - startY;
      const dist = Math.hypot(dx, dy);
      const clampedDist = Math.min(dist, maxRadius);
      const angle = Math.atan2(dy, dx);
      const kx = Math.cos(angle) * clampedDist;
      const ky = Math.sin(angle) * clampedDist;

      knobEl.style.transform = `translate(${kx}px, ${ky}px)`;
      this.setTouchMove(kx / maxRadius, -ky / maxRadius);
    };

    const handleEnd = () => {
      activeTouchId = null;
      knobEl.style.transform = 'translate(0px, 0px)';
      this.setTouchMove(0, 0);
    };

    joystickEl.addEventListener('touchstart', (e) => {
      if (e.changedTouches.length > 0) {
        const t = e.changedTouches[0];
        handleStart(t.clientX, t.clientY, t.identifier);
      }
      e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === activeTouchId) { handleMove(t.clientX, t.clientY); break; }
      }
    }, { passive: false });

    const endListener = (e: TouchEvent) => {
      if (activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) { handleEnd(); break; }
      }
    };
    window.addEventListener('touchend',   endListener);
    window.addEventListener('touchcancel', endListener);
  }

  // ─── Action buttons (brake / nitro) ───────────────────────────────────────
  private bindActionButtons(): void {
    // BRAKE — also drives reverse (negative throttle) while held
    const brakeBtn = document.querySelector<HTMLButtonElement>('[data-control="Brake"]');
    if (brakeBtn) {
      brakeBtn.addEventListener('touchstart', (e) => {
        this.touchBrakeActive  = true;
        this.touchReverseActive = true;
        this.updateBrake();
        this.updateMovement();
        e.preventDefault();
      }, { passive: false });

      const brakeEnd = () => {
        this.touchBrakeActive   = false;
        this.touchReverseActive = false;
        this.updateBrake();
        this.updateMovement();
      };
      brakeBtn.addEventListener('touchend',    brakeEnd);
      brakeBtn.addEventListener('touchcancel', brakeEnd);
    } else {
      console.warn('[Input] Brake button not found in DOM');
    }

    // NITRO — hold to jet
    const nitroBtn = document.querySelector<HTMLButtonElement>('[data-control="Nitro"]');
    if (nitroBtn) {
      nitroBtn.addEventListener('touchstart', (e) => {
        this.touchNitroActive = true;
        this.isNitroActive    = true;
        e.preventDefault();
      }, { passive: false });

      const nitroEnd = () => {
        this.touchNitroActive = false;
        this.isNitroActive    = false;
      };
      nitroBtn.addEventListener('touchend',    nitroEnd);
      nitroBtn.addEventListener('touchcancel', nitroEnd);
    } else {
      console.warn('[Input] Nitro button not found in DOM');
    }
  }
}
