import { SeasonData } from '../types';

// Per-building seasonal curves:
//   gatheringRate — berries/mushrooms/roots: peaks summer, zero in winter
//   huntingRate   — venison/leather: best in autumn, reduced but available in winter (animals exist year-round)
//   fishingRate   — fish: peaks summer, ice fishing in winter at very low rate
//   herbRate      — herbs: peaks late spring/early summer, zero in winter (plants dormant)
export const SEASON_DATA: SeasonData[] = [
  { name: 'Early Spring',  temperature: 5,   cropGrowth: 0,   gatheringRate: 0.5, huntingRate: 0.6, fishingRate: 0.5, herbRate: 0.3, snow: false, dayLength: 0.5 },
  { name: 'Mid Spring',    temperature: 12,  cropGrowth: 0.5, gatheringRate: 0.8, huntingRate: 0.7, fishingRate: 0.7, herbRate: 0.7, snow: false, dayLength: 0.6 },
  { name: 'Late Spring',   temperature: 18,  cropGrowth: 0.8, gatheringRate: 1.0, huntingRate: 0.6, fishingRate: 0.9, herbRate: 1.0, snow: false, dayLength: 0.7 },
  { name: 'Early Summer',  temperature: 24,  cropGrowth: 1.0, gatheringRate: 1.0, huntingRate: 0.5, fishingRate: 1.0, herbRate: 1.0, snow: false, dayLength: 0.8 },
  { name: 'Mid Summer',    temperature: 28,  cropGrowth: 1.0, gatheringRate: 1.0, huntingRate: 0.4, fishingRate: 1.0, herbRate: 0.8, snow: false, dayLength: 0.9 },
  { name: 'Late Summer',   temperature: 25,  cropGrowth: 0.9, gatheringRate: 0.9, huntingRate: 0.5, fishingRate: 0.9, herbRate: 0.6, snow: false, dayLength: 0.8 },
  { name: 'Early Autumn',  temperature: 18,  cropGrowth: 0.5, gatheringRate: 0.7, huntingRate: 0.8, fishingRate: 0.7, herbRate: 0.4, snow: false, dayLength: 0.6 },
  { name: 'Mid Autumn',    temperature: 10,  cropGrowth: 0,   gatheringRate: 0.5, huntingRate: 1.0, fishingRate: 0.5, herbRate: 0.2, snow: false, dayLength: 0.5 },
  { name: 'Late Autumn',   temperature: 3,   cropGrowth: 0,   gatheringRate: 0,   huntingRate: 0.8, fishingRate: 0.3, herbRate: 0,   snow: false, dayLength: 0.4 },
  { name: 'Early Winter',  temperature: -5,  cropGrowth: 0,   gatheringRate: 0,   huntingRate: 0.5, fishingRate: 0.2, herbRate: 0,   snow: true,  dayLength: 0.3 },
  { name: 'Mid Winter',    temperature: -15, cropGrowth: 0,   gatheringRate: 0,   huntingRate: 0.3, fishingRate: 0.1, herbRate: 0,   snow: true,  dayLength: 0.25 },
  { name: 'Late Winter',   temperature: -10, cropGrowth: 0,   gatheringRate: 0,   huntingRate: 0.4, fishingRate: 0.2, herbRate: 0,   snow: true,  dayLength: 0.3 },
];
