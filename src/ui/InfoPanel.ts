import type { Game } from '../Game';
import { INFO_PANEL_WIDTH, HUD_HEIGHT } from '../constants';

export class InfoPanel {
  private game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  draw(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    const id = this.game.state.selectedEntity;
    if (id === null) return;

    const world = this.game.world;
    if (!world.entityExists(id)) {
      this.game.state.selectedEntity = null;
      return;
    }

    const x = canvasWidth - INFO_PANEL_WIDTH;
    const y = HUD_HEIGHT + 10;
    const w = INFO_PANEL_WIDTH - 10;

    // Background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.9)';
    ctx.fillRect(x, y, w, 300);
    ctx.strokeStyle = '#555';
    ctx.strokeRect(x, y, w, 300);

    let textY = y + 20;
    const leftX = x + 10;
    ctx.font = '12px monospace';

    // Citizen info
    const citizen = world.getComponent<any>(id, 'citizen');
    if (citizen) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(citizen.name, leftX, textY);
      textY += 20;

      ctx.font = '12px monospace';
      ctx.fillStyle = '#aaaaaa';
      ctx.fillText(`Age: ${citizen.age}  ${citizen.isMale ? 'Male' : 'Female'}`, leftX, textY);
      textY += 16;
      ctx.fillText(`${citizen.isChild ? 'Child' : 'Adult'}  ${citizen.isEducated ? 'Educated' : 'Uneducated'}`, leftX, textY);
      textY += 20;

      // Needs bars
      const needs = world.getComponent<any>(id, 'needs');
      if (needs) {
        this.drawBar(ctx, leftX, textY, w - 20, 'Food', needs.food, '#44aa44');
        textY += 18;
        this.drawBar(ctx, leftX, textY, w - 20, 'Energy', needs.energy ?? 100, '#ffdd44');
        textY += 18;
        this.drawBar(ctx, leftX, textY, w - 20, 'Warmth', needs.warmth, '#ff8844');
        textY += 18;
        this.drawBar(ctx, leftX, textY, w - 20, 'Health', needs.health, '#ff4444');
        textY += 18;
        this.drawBar(ctx, leftX, textY, w - 20, 'Happy', needs.happiness, '#44aaff');
        textY += 22;
      }

      // Sleeping status
      if (citizen.isSleeping) {
        ctx.fillStyle = '#aaaaff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('Sleeping...', leftX, textY);
        textY += 16;
      }

      // Disease status
      if (needs?.isSick) {
        ctx.fillStyle = '#44dd44';
        ctx.font = 'bold 12px monospace';
        ctx.fillText('SICK', leftX, textY);
        textY += 16;
      }

      // Diet info
      if (needs && needs.recentDiet && needs.recentDiet.length > 0) {
        const unique = new Set(needs.recentDiet).size;
        const dietLabel = unique >= 3 ? 'Varied' : unique === 1 ? 'Monotonous' : 'Limited';
        const dietColor = unique >= 3 ? '#44aa44' : unique === 1 ? '#cc6644' : '#aaaa44';
        ctx.fillStyle = dietColor;
        ctx.font = '11px monospace';
        ctx.fillText(`Diet: ${dietLabel} (${unique} types)`, leftX, textY);
        textY += 16;
      }

      // Worker info
      const worker = world.getComponent<any>(id, 'worker');
      if (worker) {
        ctx.fillStyle = '#cccccc';
        ctx.fillText(`Job: ${worker.profession}`, leftX, textY);
        textY += 16;
        if (worker.carrying) {
          ctx.fillText(`Carrying: ${worker.carrying} x${worker.carryAmount}`, leftX, textY);
          textY += 16;
        }
      }

      // Family info
      const family = world.getComponent<any>(id, 'family');
      if (family) {
        if (family.partnerId !== null) {
          const partner = world.getComponent<any>(family.partnerId, 'citizen');
          ctx.fillText(`Partner: ${partner?.name || 'Unknown'}`, leftX, textY);
          textY += 16;
        }
        if (family.childrenIds.length > 0) {
          ctx.fillText(`Children: ${family.childrenIds.length}`, leftX, textY);
          textY += 16;
        }
        if (family.homeId !== null) {
          ctx.fillText('Has home', leftX, textY);
          textY += 16;
        }
      }

      return;
    }

    // Building info
    const building = world.getComponent<any>(id, 'building');
    if (building) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(building.name, leftX, textY);
      textY += 20;

      ctx.font = '12px monospace';
      ctx.fillStyle = '#aaaaaa';

      if (!building.completed) {
        this.drawBar(ctx, leftX, textY, w - 20, 'Construction', building.constructionProgress * 100, '#ffaa44');
        textY += 22;
      } else {
        ctx.fillText('Completed', leftX, textY);
        textY += 16;
      }

      ctx.fillText(`Size: ${building.width}x${building.height}`, leftX, textY);
      textY += 16;

      // Durability bar
      if (building.durability !== undefined) {
        const durColor = building.durability > 60 ? '#44aa44' : building.durability > 30 ? '#ddaa22' : '#ff4444';
        this.drawBar(ctx, leftX, textY, w - 20, 'Cond.', building.durability, durColor);
        textY += 18;
      }

      if (building.maxWorkers > 0) {
        const assigned = building.assignedWorkers?.length || 0;
        ctx.fillText(`Workers: ${assigned}/${building.maxWorkers}`, leftX, textY);
        textY += 16;
      }

      // House info
      const house = world.getComponent<any>(id, 'house');
      if (house) {
        ctx.fillText(`Residents: ${house.residents.length}/${house.maxResidents}`, leftX, textY);
        textY += 16;
        ctx.fillText(`Firewood: ${Math.floor(house.firewood)}`, leftX, textY);
        textY += 16;
        this.drawBar(ctx, leftX, textY, w - 20, 'Warmth', house.warmthLevel, '#ff8844');
        textY += 22;
      }

      // Producer info
      const producer = world.getComponent<any>(id, 'producer');
      if (producer) {
        ctx.fillText(`Active: ${producer.active ? 'Yes' : 'No'}`, leftX, textY);
        textY += 16;
      }
    }
  }

  private drawBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, label: string, value: number, color: string): void {
    const barWidth = width - 60;
    const barHeight = 12;
    const barX = x + 55;

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '10px monospace';
    ctx.fillText(label, x, y + 10);

    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, y, barWidth, barHeight);

    // Fill
    ctx.fillStyle = color;
    ctx.fillRect(barX, y, barWidth * (value / 100), barHeight);

    // Value text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.floor(value)}`, barX + barWidth + 4, y + 10);
  }
}
