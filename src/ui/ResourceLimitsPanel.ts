import type { Game } from '../Game';
import { HUD_HEIGHT, GATHER_LIMIT_STEP, ResourceType } from '../constants';
import { Settings } from '../Settings';
import { RESOURCE_DEFS } from '../data/ResourceDefs';

const PANEL_X = 10;
const PANEL_W = 310;
const ROW_H = 22;
const HEADER_H = 24;
const PADDING = 8;
const SM_BTN_W = 22;
const SM_BTN_H = 18;
const CLEAR_BTN_W = 46;

interface ResourceRow {
  label: string;
  /** Key used in state.resourceLimits. */
  key: string;
}

function prettifyResourceKey(resource: string): string {
  return resource
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const ROWS: ResourceRow[] = Object.values(ResourceType).map((resource) => ({
  key: resource,
  label: RESOURCE_DEFS[resource]?.name ?? prettifyResourceKey(resource),
}));

interface BtnRect { x: number; y: number; w: number; h: number; }

export class ResourceLimitsPanel {
  visible = false;

  private panelRect = { x: 0, y: 0, w: 0, h: 0 };
  private decBtns: BtnRect[] = [];
  private incBtns: BtnRect[] = [];
  private clearBtns: BtnRect[] = [];
  private closeBtnRect: BtnRect = { x: 0, y: 0, w: 0, h: 0 };

  constructor(private game: Game) {}

  isPointOver(screenX: number, screenY: number): boolean {
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

    const c = this.closeBtnRect;
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
      this.visible = false;
      return true;
    }

    for (let i = 0; i < ROWS.length; i++) {
      const { key } = ROWS[i];

      const dec = this.decBtns[i];
      if (dec && x >= dec.x && x <= dec.x + dec.w && y >= dec.y && y <= dec.y + dec.h) {
        const cur = this.game.state.resourceLimits[key] ?? 0;
        const next = Math.max(0, cur - GATHER_LIMIT_STEP);
        this.game.setResourceLimit(key, next === 0 ? undefined : next);
        return true;
      }

      const inc = this.incBtns[i];
      if (inc && x >= inc.x && x <= inc.x + inc.w && y >= inc.y && y <= inc.y + inc.h) {
        const cur = this.game.state.resourceLimits[key] ?? 0;
        this.game.setResourceLimit(key, cur + GATHER_LIMIT_STEP);
        return true;
      }

      const clr = this.clearBtns[i];
      if (clr && x >= clr.x && x <= clr.x + clr.w && y >= clr.y && y <= clr.y + clr.h) {
        this.game.setResourceLimit(key, undefined);
        return true;
      }
    }

    return this.isPointOver(screenX, screenY);
  }

  draw(ctx: CanvasRenderingContext2D, _w: number, _h: number): void {
    if (!this.visible) return;

    const panelH = HEADER_H + ROWS.length * ROW_H + PADDING;
    const panelY = HUD_HEIGHT + 10;

    this.panelRect = { x: PANEL_X, y: panelY, w: PANEL_W, h: panelH };
    this.decBtns = [];
    this.incBtns = [];
    this.clearBtns = [];

    // Background
    ctx.fillStyle = 'rgba(20, 20, 30, 0.92)';
    ctx.fillRect(PANEL_X, panelY, PANEL_W, panelH);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(PANEL_X, panelY, PANEL_W, panelH);

    // Header
    ctx.fillStyle = '#cccccc';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Resource Limits', PANEL_X + PADDING, panelY + 16);

    // Close button
    const closeX = PANEL_X + PANEL_W - 20;
    const closeY = panelY + 4;
    this.closeBtnRect = { x: closeX, y: closeY, w: 16, h: 16 };
    ctx.strokeStyle = '#888';
    ctx.strokeRect(closeX, closeY, 16, 16);
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '11px monospace';
    ctx.fillText('x', closeX + 4, closeY + 11);

    // Divider
    ctx.strokeStyle = '#444';
    ctx.beginPath();
    ctx.moveTo(PANEL_X + 4, panelY + HEADER_H - 2);
    ctx.lineTo(PANEL_X + PANEL_W - 4, panelY + HEADER_H - 2);
    ctx.stroke();

    // Rows
    for (let i = 0; i < ROWS.length; i++) {
      const row = ROWS[i];
      const rowY = panelY + HEADER_H + i * ROW_H;
      const midY = rowY + ROW_H / 2;

      const stock = this.game.getResource(row.key);
      const limit = this.game.state.resourceLimits[row.key] as number | undefined;
      const quotaMet = limit !== undefined && stock >= limit;

      // Label
      ctx.font = '11px monospace';
      ctx.fillStyle = quotaMet ? '#ff9933' : '#cccccc';
      ctx.fillText(row.label, PANEL_X + PADDING, midY + 4);

      // Current stock
      const stockStr = String(Math.floor(stock));
      ctx.fillStyle = '#777777';
      ctx.font = '10px monospace';
      const stockW = ctx.measureText(stockStr).width;
      ctx.fillText(stockStr, PANEL_X + 148 - stockW, midY + 4);

      // Buttons: [−] <value> [+] [no limit]
      const btnAreaX = PANEL_X + 152;
      const btnY = rowY + (ROW_H - SM_BTN_H) / 2;

      // [−]
      const decX = btnAreaX;
      this.decBtns.push({ x: decX, y: btnY, w: SM_BTN_W, h: SM_BTN_H });
      ctx.strokeStyle = '#884422';
      ctx.strokeRect(decX, btnY, SM_BTN_W, SM_BTN_H);
      ctx.fillStyle = 'rgba(80,30,10,0.5)';
      ctx.fillRect(decX, btnY, SM_BTN_W, SM_BTN_H);
      ctx.fillStyle = '#ffaa88';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('−', decX + 5, btnY + 13);

      // Value
      const valStr = limit !== undefined ? String(limit) : '∞';
      ctx.fillStyle = quotaMet ? '#ff9933' : '#dddddd';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(valStr, btnAreaX + SM_BTN_W + 4, btnY + 13);

      // [+]
      const incX = btnAreaX + SM_BTN_W + 40;
      this.incBtns.push({ x: incX, y: btnY, w: SM_BTN_W, h: SM_BTN_H });
      ctx.strokeStyle = '#228844';
      ctx.strokeRect(incX, btnY, SM_BTN_W, SM_BTN_H);
      ctx.fillStyle = 'rgba(10,60,20,0.5)';
      ctx.fillRect(incX, btnY, SM_BTN_W, SM_BTN_H);
      ctx.fillStyle = '#88ffaa';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('+', incX + 5, btnY + 13);

      // [no limit]
      const clrX = incX + SM_BTN_W + 4;
      this.clearBtns.push({ x: clrX, y: btnY, w: CLEAR_BTN_W, h: SM_BTN_H });
      ctx.strokeStyle = limit !== undefined ? '#666666' : '#444444';
      ctx.strokeRect(clrX, btnY, CLEAR_BTN_W, SM_BTN_H);
      ctx.fillStyle = limit !== undefined ? 'rgba(50,50,50,0.5)' : 'rgba(30,30,30,0.3)';
      ctx.fillRect(clrX, btnY, CLEAR_BTN_W, SM_BTN_H);
      ctx.fillStyle = limit !== undefined ? '#aaaaaa' : '#555555';
      ctx.font = '10px monospace';
      ctx.fillText('no limit', clrX + 3, btnY + 12);

    }
  }
}
