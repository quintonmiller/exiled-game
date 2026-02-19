import type { Game } from '../Game';
import {
  TICKS_PER_SUB_SEASON, SUB_SEASONS_PER_YEAR, TICKS_PER_DAY,
  DAWN_START, DUSK_START, NIGHT_DARKNESS,
} from '../constants';
import { SEASON_DATA } from '../data/SeasonDefs';

export class SeasonSystem {
  private game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  update(): void {
    const state = this.game.state;
    state.tickInSubSeason++;

    if (state.tickInSubSeason >= TICKS_PER_SUB_SEASON) {
      state.tickInSubSeason = 0;
      state.subSeason++;

      if (state.subSeason >= SUB_SEASONS_PER_YEAR) {
        state.subSeason = 0;
        state.year++;
        this.game.eventBus.emit('new_year', { year: state.year });
      }

      this.game.eventBus.emit('season_changed', {
        subSeason: state.subSeason,
        data: SEASON_DATA[state.subSeason],
      });
    }

    // Day/night cycle
    this.updateDayNight();
  }

  private updateDayNight(): void {
    const state = this.game.state;
    const seasonData = SEASON_DATA[state.subSeason];

    // Progress within the current day (0..1), using global tick so day/night
    // cycle is independent of season length
    const tickInDay = state.tick % TICKS_PER_DAY;
    state.dayProgress = tickInDay / TICKS_PER_DAY;

    // dayLength from season data affects how long the day portion is
    // dayLength=0.9 means 90% of the cycle is daylight (summer)
    // dayLength=0.25 means 25% is daylight (deep winter)
    const dayLen = seasonData.dayLength;

    // Calculate dawn/dusk/night boundaries scaled by season
    // Dawn occupies first 10% of the day portion
    // Dusk occupies last 10% of the day portion
    const dawnEnd = (1 - dayLen) / 2 + dayLen * 0.1;
    const duskBegin = (1 - dayLen) / 2 + dayLen * 0.9;
    const nightBegin = (1 + dayLen) / 2;
    const nightEnd = (1 - dayLen) / 2;

    const p = state.dayProgress;

    if (p < nightEnd) {
      // Deep night (before dawn)
      state.isNight = true;
      state.isDawn = false;
      state.isDusk = false;
      state.nightAlpha = NIGHT_DARKNESS;
    } else if (p < dawnEnd) {
      // Dawn transition
      state.isNight = false;
      state.isDawn = true;
      state.isDusk = false;
      const t = (p - nightEnd) / (dawnEnd - nightEnd);
      state.nightAlpha = NIGHT_DARKNESS * (1 - t);
    } else if (p < duskBegin) {
      // Full daylight
      state.isNight = false;
      state.isDawn = false;
      state.isDusk = false;
      state.nightAlpha = 0;
    } else if (p < nightBegin) {
      // Dusk transition
      state.isNight = false;
      state.isDawn = false;
      state.isDusk = true;
      const t = (p - duskBegin) / (nightBegin - duskBegin);
      state.nightAlpha = NIGHT_DARKNESS * t;
    } else {
      // Night (after dusk)
      state.isNight = true;
      state.isDawn = false;
      state.isDusk = false;
      state.nightAlpha = NIGHT_DARKNESS;
    }
  }

  getCurrentSeason(): typeof SEASON_DATA[0] {
    return SEASON_DATA[this.game.state.subSeason];
  }

  /** Is it currently daytime (citizens should work)? */
  isDaytime(): boolean {
    const s = this.game.state;
    return !s.isNight;
  }
}
