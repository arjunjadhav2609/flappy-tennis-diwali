/**
 * Input Controls System
 * Manages independent input bindings for Player 1 and Player 2 across
 * Keyboard, Mouse, and Touch devices (including simultaneous multi-touch support).
 */

export class Controls {
  constructor(callbacks = {}) {
    this.onP1Tap = callbacks.onP1Tap || (() => {});
    this.onP2Tap = callbacks.onP2Tap || (() => {});
    this.isPvC = true;

    this.activeKeys = new Set();
    this.initKeyboard();
    this.initTouchAndMouse();
  }

  setMode(isPvC) {
    this.isPvC = isPvC;
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      // Ignore repeating keys for crisp single impulses per tap
      if (e.repeat) return;

      const key = e.code;

      // Player 1 Keys: W, KeyA, Space (in PvC mode, Space is also P1)
      if (key === 'KeyW' || key === 'KeyA' || (this.isPvC && key === 'Space')) {
        e.preventDefault();
        this.onP1Tap();
      }

      // Player 2 Keys: ArrowUp, Numpad8
      if (key === 'ArrowUp' || key === 'Numpad8') {
        e.preventDefault();
        this.onP2Tap();
      }

      // In PvP mode, Space can be P1 and Enter can be P2
      if (!this.isPvC) {
        if (key === 'Space') {
          e.preventDefault();
          this.onP1Tap();
        } else if (key === 'Enter' || key === 'NumpadEnter') {
          e.preventDefault();
          this.onP2Tap();
        }
      }
    });
  }

  initTouchAndMouse() {
    // Touch/pointer screen split:
    // Left half = Player 1
    // Right half = Player 2 (or P1 anywhere in PvC)
    const courtCanvas = document.getElementById('courtCanvas');
    if (!courtCanvas) return;

    const handlePointerDown = (clientX, clientY) => {
      const rect = courtCanvas.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const width = rect.width;

      if (this.isPvC) {
        // In PvC mode, tapping anywhere on the game canvas moves Player 1
        this.onP1Tap();
      } else {
        // In PvP mode, left half controls P1, right half controls P2
        if (relativeX < width / 2) {
          this.onP1Tap();
        } else {
          this.onP2Tap();
        }
      }
    };

    // Touch events with multi-touch support
    courtCanvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        handlePointerDown(touch.clientX, touch.clientY);
      }
    }, { passive: false });

    // Mouse click event
    courtCanvas.addEventListener('mousedown', (e) => {
      // Only process primary button
      if (e.button === 0) {
        handlePointerDown(e.clientX, e.clientY);
      }
    });

    // Dedicated on-screen control buttons for mobile/tablet touch
    const p1Btn = document.getElementById('btnTapP1');
    const p2Btn = document.getElementById('btnTapP2');

    if (p1Btn) {
      const triggerP1 = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onP1Tap();
      };
      p1Btn.addEventListener('touchstart', triggerP1, { passive: false });
      p1Btn.addEventListener('mousedown', triggerP1);
    }

    if (p2Btn) {
      const triggerP2 = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.onP2Tap();
      };
      p2Btn.addEventListener('touchstart', triggerP2, { passive: false });
      p2Btn.addEventListener('mousedown', triggerP2);
    }
  }
}
