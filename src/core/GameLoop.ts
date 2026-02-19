import { TICK_DURATION } from '../constants';

export class GameLoop {
  private lastTime = 0;
  private accumulator = 0;
  private running = false;
  private rafId = 0;
  private speedMultiplier = 1;

  constructor(
    private onTick: (dt: number) => void,
    private onRender: (interp: number) => void,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  setSpeed(multiplier: number): void {
    this.speedMultiplier = multiplier;
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    const frameTime = Math.min(now - this.lastTime, 250); // cap to avoid spiral of death
    this.lastTime = now;

    if (this.speedMultiplier > 0) {
      this.accumulator += frameTime * this.speedMultiplier;

      while (this.accumulator >= TICK_DURATION) {
        this.onTick(TICK_DURATION / 1000);
        this.accumulator -= TICK_DURATION;
      }
    }

    const interp = this.accumulator / TICK_DURATION;
    this.onRender(interp);
  };
}
