import * as THREE from 'three';

export class InputManager {
  public moveVector: THREE.Vector2 = new THREE.Vector2(0, 0);
  public jumpRequested: boolean = false;
  public resetRequested: boolean = false;
  public pauseRequested: boolean = false;
  public isBrakeHeld: boolean = false;

  private keysDown: Set<string> = new Set();
  private touchMoveVector: THREE.Vector2 = new THREE.Vector2(0, 0);

  constructor() {
    this.bindKeyboard();
    this.bindTouchJoystick();
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      // Don't intercept browser shortcuts like Ctrl+Shift+I or F12
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const code = e.code;
      this.keysDown.add(code);

      if (code === 'Space') {
        this.isBrakeHeld = true;
        this.jumpRequested = true;
        e.preventDefault();
      }
      if (code === 'KeyR') {
        this.resetRequested = true;
      }
      if (code === 'KeyP' || code === 'Escape') {
        this.pauseRequested = true;
      }

      this.updateMovement();
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
      if (e.code === 'Space') this.isBrakeHeld = false;
      this.updateMovement();
    });

    window.addEventListener('blur', () => {
      this.keysDown.clear();
      this.moveVector.set(0, 0);
      this.isBrakeHeld = false;
    });
  }

  private updateMovement(): void {
    let x = 0;
    let y = 0;

    // A / D or Left / Right
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) x -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) x += 1;

    // W / S or Up / Down
    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) y += 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) y -= 1;

    // Combine with touch controls
    x += this.touchMoveVector.x;
    y += this.touchMoveVector.y;

    this.moveVector.set(x, y);
    if (this.moveVector.lengthSq() > 1.0) {
      this.moveVector.normalize();
    }
  }

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

  private bindTouchJoystick(): void {
    const joystickEl = document.querySelector<HTMLButtonElement>('[data-joystick]');
    const knobEl = document.querySelector<HTMLSpanElement>('.joystick-knob');
    if (!joystickEl || !knobEl) return;

    let activeTouchId: number | null = null;
    let startX = 0;
    let startY = 0;
    const maxRadius = 38;

    const handleStart = (clientX: number, clientY: number, id: number) => {
      activeTouchId = id;
      const rect = joystickEl.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
      handleMove(clientX, clientY);
    };

    const handleMove = (clientX: number, clientY: number) => {
      const dx = clientX - startX;
      const dy = clientY - startY;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const clampedDist = Math.min(dist, maxRadius);

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
        if (t.identifier === activeTouchId) {
          handleMove(t.clientX, t.clientY);
          break;
        }
      }
    }, { passive: false });

    const endListener = (e: TouchEvent) => {
      if (activeTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
          handleEnd();
          break;
        }
      }
    };
    window.addEventListener('touchend', endListener);
    window.addEventListener('touchcancel', endListener);

    // Jump button touch
    const jumpBtn = document.querySelector<HTMLButtonElement>('[data-control="Space"]');
    if (jumpBtn) {
      jumpBtn.addEventListener('touchstart', (e) => {
        this.triggerTouchJump();
        e.preventDefault();
      }, { passive: false });
    }
  }
}
