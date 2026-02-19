import type { Game } from '../Game';
import { BuildingType, ResourceType, TICKS_PER_YEAR } from '../constants';
import { RESOURCE_DEFS } from '../data/ResourceDefs';

interface Merchant {
  arriving: number; // tick when merchant arrives
  departing: number; // tick when merchant leaves
  wares: Map<string, number>;
  wants: Map<string, number>;
  active: boolean;
}

export class TradeSystem {
  private game: Game;
  private merchant: Merchant | null = null;
  private lastVisit = 0;

  constructor(game: Game) {
    this.game = game;
  }

  update(): void {
    const tick = this.game.state.tick;

    // Check for trading post
    const hasTradingPost = this.hasBuildingType(BuildingType.TRADING_POST);
    if (!hasTradingPost) return;

    // Merchant visits once per year (roughly)
    if (!this.merchant && tick - this.lastVisit > TICKS_PER_YEAR * 0.8) {
      if (this.game.rng.chance(0.002)) {
        this.spawnMerchant(tick);
      }
    }

    // Handle active merchant
    if (this.merchant?.active) {
      if (tick >= this.merchant.departing) {
        this.merchant.active = false;
        this.merchant = null;
        this.game.eventBus.emit('merchant_departed', {});
      }
    }
  }

  private spawnMerchant(tick: number): void {
    const rng = this.game.rng;
    const wares = new Map<string, number>();
    const wants = new Map<string, number>();

    // Merchant brings random goods
    const possibleWares = [
      ResourceType.LOG, ResourceType.STONE, ResourceType.IRON,
      ResourceType.TOOL, ResourceType.COAT, ResourceType.FIREWOOD,
    ];

    for (let i = 0; i < 3; i++) {
      const type = rng.pick(possibleWares);
      wares.set(type, rng.int(20, 80));
    }

    // Merchant wants food or resources
    const possibleWants = [
      ResourceType.BERRIES, ResourceType.VENISON, ResourceType.FISH,
      ResourceType.LOG, ResourceType.LEATHER,
    ];

    for (let i = 0; i < 2; i++) {
      const type = rng.pick(possibleWants);
      wants.set(type, rng.int(30, 100));
    }

    this.merchant = {
      arriving: tick,
      departing: tick + 600, // stays for ~60 seconds
      wares,
      wants,
      active: true,
    };

    this.lastVisit = tick;
    this.game.eventBus.emit('merchant_arrived', { wares, wants });
  }

  getMerchant(): Merchant | null {
    return this.merchant;
  }

  /** Execute a trade: give `give` resources, receive `receive` resources */
  executeTrade(giveType: string, giveAmount: number, receiveType: string, receiveAmount: number): boolean {
    if (!this.merchant?.active) return false;

    // Check player has resources
    if (this.game.getResource(giveType) < giveAmount) return false;

    // Check merchant has resources
    const merchantHas = this.merchant.wares.get(receiveType) || 0;
    if (merchantHas < receiveAmount) return false;

    // Execute trade
    this.game.removeResource(giveType, giveAmount);
    this.game.addResource(receiveType, receiveAmount);
    this.merchant.wares.set(receiveType, merchantHas - receiveAmount);

    return true;
  }

  private hasBuildingType(type: string): boolean {
    const buildings = this.game.world.getComponentStore<any>('building');
    if (!buildings) return false;
    for (const [, bld] of buildings) {
      if (bld.type === type && bld.completed) return true;
    }
    return false;
  }
}
