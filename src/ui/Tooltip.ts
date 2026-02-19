import type { Game } from '../Game';

export class Tooltip {
  private game: Game;
  private text: string = '';
  private visible = false;
  private x = 0;
  private y = 0;

  constructor(game: Game) {
    this.game = game;
  }

  show(text: string, x: number, y: number): void {
    this.text = text;
    this.x = x;
    this.y = y;
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible || !this.text) return;

    ctx.font = '11px monospace';
    const metrics = ctx.measureText(this.text);
    const padding = 6;
    const w = metrics.width + padding * 2;
    const h = 20;

    const tx = this.x + 15;
    const ty = this.y - 10;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(tx, ty, w, h);
    ctx.strokeStyle = '#666';
    ctx.strokeRect(tx, ty, w, h);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.text, tx + padding, ty + 14);
  }
}
