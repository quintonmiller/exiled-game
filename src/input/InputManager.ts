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
  private readonly handleKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.key.toLowerCase());
    // Prevent default for game keys
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'f3', 'f4'].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  };
  private readonly handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };
  private readonly handleMouseMove = (e: MouseEvent) => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
  };
  private readonly handleMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.leftDown = true;
    if (e.button === 1) this.middleDown = true;
    if (e.button === 2) this.rightDown = true;
    this.mouseDownListeners.forEach(fn => fn(e.clientX, e.clientY, e.button));
  };
  private readonly handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.leftDown = false;
      this.clickListeners.forEach(fn => fn(e.clientX, e.clientY, 0));
    }
    if (e.button === 1) this.middleDown = false;
    if (e.button === 2) {
      this.rightDown = false;
      this.clickListeners.forEach(fn => fn(e.clientX, e.clientY, 2));
    }
  };
  private readonly handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.scrollDelta += e.deltaY > 0 ? -1 : 1;
  };
  private readonly handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    canvas.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('mousedown', this.handleMouseDown);
    canvas.addEventListener('mouseup', this.handleMouseUp);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    this.keys.clear();
    this.clickListeners = [];
    this.mouseDownListeners = [];
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
