import { SeasonData } from '../types';

export const SEASON_DATA: SeasonData[] = [
  { name: 'Early Spring',  temperature: 5,   cropGrowth: 0,   gatheringRate: 0.3, snow: false, dayLength: 0.5 },
  { name: 'Mid Spring',    temperature: 12,  cropGrowth: 0.5, gatheringRate: 0.7, snow: false, dayLength: 0.6 },
  { name: 'Late Spring',   temperature: 18,  cropGrowth: 0.8, gatheringRate: 1.0, snow: false, dayLength: 0.7 },
  { name: 'Early Summer',  temperature: 24,  cropGrowth: 1.0, gatheringRate: 1.0, snow: false, dayLength: 0.8 },
  { name: 'Mid Summer',    temperature: 28,  cropGrowth: 1.0, gatheringRate: 1.0, snow: false, dayLength: 0.9 },
  { name: 'Late Summer',   temperature: 25,  cropGrowth: 0.9, gatheringRate: 0.9, snow: false, dayLength: 0.8 },
  { name: 'Early Autumn',  temperature: 18,  cropGrowth: 0.5, gatheringRate: 0.7, snow: false, dayLength: 0.6 },
  { name: 'Mid Autumn',    temperature: 10,  cropGrowth: 0,   gatheringRate: 0.3, snow: false, dayLength: 0.5 },
  { name: 'Late Autumn',   temperature: 3,   cropGrowth: 0,   gatheringRate: 0,   snow: false, dayLength: 0.4 },
  { name: 'Early Winter',  temperature: -5,  cropGrowth: 0,   gatheringRate: 0,   snow: true,  dayLength: 0.3 },
  { name: 'Mid Winter',    temperature: -15, cropGrowth: 0,   gatheringRate: 0,   snow: true,  dayLength: 0.25 },
  { name: 'Late Winter',   temperature: -10, cropGrowth: 0,   gatheringRate: 0,   snow: true,  dayLength: 0.3 },
];
