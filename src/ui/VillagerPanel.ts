import type { Game } from '../Game';
import { HUD_HEIGHT } from '../constants';
import { Settings } from '../Settings';

const PANEL_MARGIN = 10;
const PANEL_W = 360;
const PANEL_PADDING = 6;
const HEADER_H = 24;
const ROW_H = 18;
const VISIBLE_ROWS = 18;

interface LinkRect {
  x: number;
  y: number;
  w: number;
  h: number;
  entityId: number;
}

interface VillagerRow {
  id: number;
  name: string;
  lastName: string;
  isMale: boolean;
  age: number;
  isChild: boolean;
  partnerId: number | null;
  partnerName: string | null;
  partnerAge: number | null;
  partnerIsMale: boolean | null;
}

export class VillagerPanel {
  visible = false;

  private panelRect = { x: 0, y: 0, w: 0, h: 0 };
  private closeBtnRect = { x: 0, y: 0, w: 0, h: 0 };
  private scrollUpRect = { x: 0, y: 0, w: 0, h: 0 };
  private scrollDownRect = { x: 0, y: 0, w: 0, h: 0 };
  private linkRects: LinkRect[] = [];
  private scrollOffset = 0;

  constructor(private game: Game) {}

  isPointOver(screenX: number, screenY: number): boolean {
    if (!this.visible) return false;
    const s = Settings.get('uiScale');
    const x = screenX / s;
    const y = screenY / s;
    const r = this.panelRect;
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  handleClick(screenX: number, screenY: number): boolean {
    if (!this.visible) return false;

    const s = Settings.get('uiScale');
    const x = screenX / s;
    const y = screenY / s;

    const r = this.panelRect;
    if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) {
      return false;
    }

    const c = this.closeBtnRect;
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
      this.visible = false;
      return true;
    }

    const su = this.scrollUpRect;
    if (su.h > 0 && x >= su.x && x <= su.x + su.w && y >= su.y && y <= su.y + su.h) {
      this.scrollOffset = Math.max(0, this.scrollOffset - 1);
      return true;
    }

    const sd = this.scrollDownRect;
    if (sd.h > 0 && x >= sd.x && x <= sd.x + sd.w && y >= sd.y && y <= sd.y + sd.h) {
      const maxScroll = Math.max(0, this.buildRows().length - VISIBLE_ROWS);
      this.scrollOffset = Math.min(maxScroll, this.scrollOffset + 1);
      return true;
    }

    for (const link of this.linkRects) {
      if (x >= link.x && x <= link.x + link.w && y >= link.y && y <= link.y + link.h) {
        this.selectAndFocus(link.entityId);
        return true;
      }
    }

    return true;
  }

  handleScroll(delta: number, mouseX: number, mouseY: number): boolean {
    if (!this.visible) return false;

    const s = Settings.get('uiScale');
    const x = mouseX / s;
    const y = mouseY / s;

    const r = this.panelRect;
    if (x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) {
      return false;
    }

    const maxScroll = Math.max(0, this.buildRows().length - VISIBLE_ROWS);
    const direction = Math.sign(delta);
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset - direction));
    return true;
  }

  draw(ctx: CanvasRenderingContext2D, canvasWidth: number, _canvasHeight: number): void {
    if (!this.visible) return;

    this.linkRects = [];

    const rows = this.buildRows();
    const panelW = Math.min(PANEL_W, Math.max(240, Math.floor(canvasWidth * 0.42)));
    const preferredX = 320;
    const panelX = Math.min(Math.max(PANEL_MARGIN, preferredX), canvasWidth - panelW - PANEL_MARGIN);
    const panelY = HUD_HEIGHT + PANEL_MARGIN;
    const panelH = HEADER_H + VISIBLE_ROWS * ROW_H + PANEL_PADDING * 2;
    this.panelRect = { x: panelX, y: panelY, w: panelW, h: panelH };

    ctx.fillStyle = 'rgba(15, 18, 24, 0.92)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`Villagers (${rows.length})`, panelX + PANEL_PADDING, panelY + 16);

    const closeX = panelX + panelW - 22;
    const closeY = panelY + 4;
    this.closeBtnRect = { x: closeX, y: closeY, w: 18, h: 16 };
    ctx.fillStyle = 'rgba(80, 30, 30, 0.6)';
    ctx.fillRect(closeX, closeY, 18, 16);
    ctx.strokeStyle = '#cc4444';
    ctx.strokeRect(closeX, closeY, 18, 16);
    ctx.fillStyle = '#ff6666';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('X', closeX + 4, closeY + 12);

    const dividerY = panelY + HEADER_H;
    ctx.strokeStyle = '#444';
    ctx.beginPath();
    ctx.moveTo(panelX, dividerY);
    ctx.lineTo(panelX + panelW, dividerY);
    ctx.stroke();

    const maxScroll = Math.max(0, rows.length - VISIBLE_ROWS);
    this.scrollOffset = Math.min(this.scrollOffset, maxScroll);

    const startIdx = this.scrollOffset;
    const visibleCount = Math.min(VISIBLE_ROWS, rows.length);
    const rowsY = dividerY + PANEL_PADDING;

    for (let i = 0; i < visibleCount; i++) {
      const row = rows[startIdx + i];
      const rowY = rowsY + i * ROW_H;

      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(panelX + 2, rowY - 2, panelW - 4, ROW_H);
      }

      const textY = rowY + 12;
      let cursorX = panelX + PANEL_PADDING;
      const rowRight = panelX + panelW - PANEL_PADDING - 14;

      // Gender circle
      const circleR = 4;
      const circleX = cursorX + circleR;
      const circleY = textY - 4;
      ctx.beginPath();
      ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
      ctx.fillStyle = row.isMale ? '#5599ff' : '#ff77aa';
      ctx.fill();
      cursorX += circleR * 2 + 5;

      const ageLabel = ` (${row.age})`;
      const ageW = ctx.measureText(ageLabel).width;
      const minPartnerW = row.partnerId !== null && row.partnerName ? 52 : 0;
      const nameMaxW = Math.max(30, rowRight - cursorX - ageW - minPartnerW);
      cursorX += this.drawLink(ctx, row.name, cursorX, textY, row.id, nameMaxW);

      if (cursorX + ageW <= rowRight) {
        ctx.fillStyle = '#888';
        ctx.font = '11px monospace';
        ctx.fillText(ageLabel, cursorX, textY);
        cursorX += ageW;
      }

      if (row.partnerId !== null && row.partnerName) {
        ctx.fillStyle = '#888';
        ctx.font = '11px monospace';
        const separator = '  ·  ';
        const sepW = ctx.measureText(separator).width;
        const partnerAgeLabel = ` (${row.partnerAge})`;
        const partnerAgeW = ctx.measureText(partnerAgeLabel).width;
        const partnerPrefixW = sepW + circleR * 2 + 5;
        if (cursorX + partnerPrefixW + 18 <= rowRight) {
          ctx.fillText(separator, cursorX, textY);
          cursorX += sepW;

          // Partner gender circle
          ctx.beginPath();
          ctx.arc(cursorX + circleR, circleY, circleR, 0, Math.PI * 2);
          ctx.fillStyle = row.partnerIsMale ? '#5599ff' : '#ff77aa';
          ctx.fill();
          cursorX += circleR * 2 + 5;

          const partnerMaxW = Math.max(18, rowRight - cursorX - partnerAgeW);
          cursorX += this.drawLink(ctx, row.partnerName, cursorX, textY, row.partnerId, partnerMaxW);

          if (cursorX + partnerAgeW <= rowRight) {
            ctx.fillStyle = '#888';
            ctx.font = '11px monospace';
            ctx.fillText(partnerAgeLabel, cursorX, textY);
          }
        }
      } else if (!row.isChild) {
        ctx.fillStyle = '#666';
        ctx.font = '11px monospace';
        const singleLabel = this.truncateText(ctx, '  single', Math.max(0, rowRight - cursorX));
        ctx.fillText(singleLabel, cursorX, textY);
      }
    }

    const arrowX = panelX + panelW - 16;
    this.scrollUpRect = { x: 0, y: 0, w: 0, h: 0 };
    this.scrollDownRect = { x: 0, y: 0, w: 0, h: 0 };

    if (this.scrollOffset > 0) {
      const ay = rowsY - 2;
      this.scrollUpRect = { x: arrowX - 4, y: ay, w: 16, h: 12 };
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.fillText('\u25B2', arrowX, ay + 10);
    }

    if (this.scrollOffset < maxScroll) {
      const ay = rowsY + VISIBLE_ROWS * ROW_H - 10;
      this.scrollDownRect = { x: arrowX - 4, y: ay, w: 16, h: 12 };
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      ctx.fillText('\u25BC', arrowX, ay + 10);
    }

    if (rows.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '11px monospace';
      ctx.fillText('No villagers found.', panelX + PANEL_PADDING, rowsY + 20);
    }
  }

  private buildRows(): VillagerRow[] {
    const world = this.game.world;
    const citizens = world.getComponentStore<any>('citizen');
    const families = world.getComponentStore<any>('family');
    if (!citizens || !families) return [];

    const rows: VillagerRow[] = [];
    for (const [id, citizen] of citizens) {
      const family = families.get(id);
      const partnerId = family?.partnerId ?? null;
      let partnerName: string | null = null;
      let partnerCitizenForGender: any = null;

      if (partnerId !== null && world.entityExists(partnerId)) {
        partnerCitizenForGender = world.getComponent<any>(partnerId, 'citizen');
        partnerName = partnerCitizenForGender?.name || null;
      }

      rows.push({
        id,
        name: citizen.name || `Citizen ${id}`,
        lastName: citizen.lastName || '',
        isMale: citizen.isMale ?? true,
        age: citizen.age ?? 0,
        isChild: citizen.isChild ?? false,
        partnerId,
        partnerName,
        partnerAge: partnerCitizenForGender ? (partnerCitizenForGender.age ?? 0) : null,
        partnerIsMale: partnerCitizenForGender ? (partnerCitizenForGender.isMale ?? true) : null,
      });
    }

    rows.sort((a, b) => {
      const cmp = a.lastName.localeCompare(b.lastName);
      return cmp !== 0 ? cmp : a.name.localeCompare(b.name);
    });
    return rows;
  }

  private drawLink(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    entityId: number,
    maxWidth = Number.POSITIVE_INFINITY,
  ): number {
    ctx.font = '11px monospace';
    const label = this.truncateText(ctx, text, maxWidth);
    if (label.length === 0) return 0;

    const width = ctx.measureText(label).width;
    ctx.fillStyle = '#66ccff';
    ctx.fillText(label, x, y);

    ctx.strokeStyle = '#66ccff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 2);
    ctx.lineTo(x + width, y + 2);
    ctx.stroke();

    this.linkRects.push({ x, y: y - 11, w: width, h: 14, entityId });
    return width;
  }

  private truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (maxWidth <= 0) return '';
    if (ctx.measureText(text).width <= maxWidth) return text;

    const ellipsis = '...';
    const ellipsisW = ctx.measureText(ellipsis).width;
    if (ellipsisW > maxWidth) return '';

    let out = text;
    while (out.length > 0 && ctx.measureText(out + ellipsis).width > maxWidth) {
      out = out.slice(0, -1);
    }
    return out + ellipsis;
  }

  private selectAndFocus(entityId: number): void {
    if (!this.game.world.entityExists(entityId)) return;
    this.game.state.selectedEntity = entityId;
    const pos = this.game.world.getComponent<any>(entityId, 'position');
    if (pos) {
      this.game.camera.centerOn(pos.tileX, pos.tileY);
    }
  }
}
