import type { Game } from '../Game';
import { TileType, MAP_WIDTH, MAP_HEIGHT, MINIMAP_SIZE } from '../constants';

export class Minimap {
  private game: Game;
  private buffer: HTMLCanvasElement;
  private bufferCtx: CanvasRenderingContext2D;
  private dirty = true;

  constructor(game: Game) {
    this.game = game;
    this.buffer = document.createElement('canvas');
    this.buffer.width = MINIMAP_SIZE;
    this.buffer.height = MINIMAP_SIZE;
    this.bufferCtx = this.buffer.getContext('2d')!;
  }

  /** Get the screen position of the minimap given current layout */
  getPosition(canvasHeight: number, buildMenuOpen: boolean, buildMenuHeight: number): { x: number; y: number } {
    const x = 10;
    const bottomMargin = buildMenuOpen ? buildMenuHeight + 10 : 40;
    const y = canvasHeight - MINIMAP_SIZE - bottomMargin;
    return { x, y };
  }

  handleClick(localX: number, localY: number): void {
    const tileX = Math.floor((localX / MINIMAP_SIZE) * MAP_WIDTH);
    const tileY = Math.floor((localY / MINIMAP_SIZE) * MAP_HEIGHT);
    this.game.camera.centerOn(tileX, tileY);
  }

  draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, buildMenuOpen: boolean, buildMenuHeight: number): void {
    const { x, y } = this.getPosition(canvasHeight, buildMenuOpen, buildMenuHeight);

    // Render minimap to buffer (only when dirty)
    if (this.dirty) {
      this.renderBuffer();
      this.dirty = false;
    }

    // Semi-transparent background behind minimap
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - 2, y - 2, MINIMAP_SIZE + 4, MINIMAP_SIZE + 4);

    // Draw buffer
    ctx.drawImage(this.buffer, x, y);

    // Draw border
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, MINIMAP_SIZE, MINIMAP_SIZE);

    // Draw camera viewport indicator
    const cam = this.game.camera;
    const scaleX = MINIMAP_SIZE / (MAP_WIDTH * 32);
    const scaleY = MINIMAP_SIZE / (MAP_HEIGHT * 32);
    const vpX = x + cam.x * scaleX;
    const vpY = y + cam.y * scaleY;
    const vpW = (cam.screenWidth / cam.zoom) * scaleX;
    const vpH = (cam.screenHeight / cam.zoom) * scaleY;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(vpX, vpY, vpW, vpH);

    // Draw citizen dots
    const citizens = this.game.world.getComponentStore<any>('citizen');
    const positions = this.game.world.getComponentStore<any>('position');
    if (citizens && positions) {
      ctx.fillStyle = '#ffff00';
      for (const [id] of citizens) {
        const pos = positions.get(id);
        if (!pos) continue;
        const px = x + (pos.tileX / MAP_WIDTH) * MINIMAP_SIZE;
        const py = y + (pos.tileY / MAP_HEIGHT) * MINIMAP_SIZE;
        ctx.fillRect(px, py, 2, 2);
      }
    }

    // Draw building dots
    const buildings = this.game.world.getComponentStore<any>('building');
    if (buildings && positions) {
      for (const [id, bld] of buildings) {
        const pos = positions.get(id);
        if (!pos) continue;
        ctx.fillStyle = bld.completed ? '#cc8833' : '#ff8800';
        const px = x + (pos.tileX / MAP_WIDTH) * MINIMAP_SIZE;
        const py = y + (pos.tileY / MAP_HEIGHT) * MINIMAP_SIZE;
        const pw = Math.max(2, (bld.width / MAP_WIDTH) * MINIMAP_SIZE);
        const ph = Math.max(2, (bld.height / MAP_HEIGHT) * MINIMAP_SIZE);
        ctx.fillRect(px, py, pw, ph);
      }
    }
  }

  private renderBuffer(): void {
    const ctx = this.bufferCtx;
    const tileMap = this.game.tileMap;

    const imageData = ctx.createImageData(MINIMAP_SIZE, MINIMAP_SIZE);
    const data = imageData.data;

    for (let y = 0; y < MINIMAP_SIZE; y++) {
      for (let x = 0; x < MINIMAP_SIZE; x++) {
        const tileX = Math.floor((x / MINIMAP_SIZE) * MAP_WIDTH);
        const tileY = Math.floor((y / MINIMAP_SIZE) * MAP_HEIGHT);
        const tile = tileMap.get(tileX, tileY);
        if (!tile) continue;

        const idx = (y * MINIMAP_SIZE + x) * 4;
        const color = this.getTileColor(tile.type);
        data[idx] = color[0];
        data[idx + 1] = color[1];
        data[idx + 2] = color[2];
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  private getTileColor(type: number): [number, number, number] {
    switch (type) {
      case TileType.GRASS: return [74, 140, 63];
      case TileType.FOREST: return [45, 107, 36];
      case TileType.WATER: return [40, 86, 160];
      case TileType.STONE: return [138, 138, 138];
      case TileType.IRON: return [107, 91, 62];
      case TileType.RIVER: return [54, 104, 181];
      case TileType.FERTILE: return [90, 156, 74];
      case TileType.BRIDGE: return [139, 105, 20];
      default: return [74, 140, 63];
    }
  }

  invalidate(): void {
    this.dirty = true;
  }
}
