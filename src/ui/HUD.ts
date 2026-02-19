// HUD is currently drawn directly by RenderSystem.drawHUD and UIManager
// This file exists for future expansion

import type { Game } from '../Game';

export class HUD {
  private game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  draw(ctx: CanvasRenderingContext2D, width: number): void {
    // Main HUD is drawn by RenderSystem.drawHUD
    // Additional HUD elements can be added here
  }
}
