export class InputManager {
  readonly keys = new Set<string>();
  mouseX = 0;
  mouseY = 0;
  mouseWorldX = 0;
  mouseWorldY = 0;
  leftDown = false;
  rightDown = false;
  middleDown = false;
  scrollDelta = 0;
  private clickListeners: Array<(x: number, y: number, button: number) => void> = [];
  private mouseDownListeners: Array<(x: number, y: number, button: number) => void> = [];
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      // Prevent default for game keys
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'f3', 'f4'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    canvas.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.leftDown = true;
      if (e.button === 1) this.middleDown = true;
      if (e.button === 2) this.rightDown = true;
      this.mouseDownListeners.forEach(fn => fn(e.clientX, e.clientY, e.button));
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.leftDown = false;
        this.clickListeners.forEach(fn => fn(e.clientX, e.clientY, 0));
      }
      if (e.button === 1) this.middleDown = false;
      if (e.button === 2) {
        this.rightDown = false;
        this.clickListeners.forEach(fn => fn(e.clientX, e.clientY, 2));
      }
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.scrollDelta += e.deltaY > 0 ? -1 : 1;
    }, { passive: false });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onClick(fn: (x: number, y: number, button: number) => void): void {
    this.clickListeners.push(fn);
  }

  onMouseDown(fn: (x: number, y: number, button: number) => void): void {
    this.mouseDownListeners.push(fn);
  }

  isKeyDown(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  consumeScroll(): number {
    const d = this.scrollDelta;
    this.scrollDelta = 0;
    return d;
  }
}
