import { Profession } from '../constants';
import { ProfessionDef } from '../types';

export const PROFESSION_DEFS: Record<string, ProfessionDef> = {
  [Profession.LABORER]: { type: Profession.LABORER, name: 'Laborer', tool: false },
  [Profession.FARMER]: { type: Profession.FARMER, name: 'Farmer', tool: true },
  [Profession.GATHERER]: { type: Profession.GATHERER, name: 'Gatherer', tool: false },
  [Profession.HUNTER]: { type: Profession.HUNTER, name: 'Hunter', tool: true },
  [Profession.FISHERMAN]: { type: Profession.FISHERMAN, name: 'Fisherman', tool: true },
  [Profession.FORESTER]: { type: Profession.FORESTER, name: 'Forester', tool: true },
  [Profession.WOOD_CUTTER]: { type: Profession.WOOD_CUTTER, name: 'Wood Cutter', tool: true },
  [Profession.BLACKSMITH]: { type: Profession.BLACKSMITH, name: 'Blacksmith', tool: true },
  [Profession.TAILOR]: { type: Profession.TAILOR, name: 'Tailor', tool: false },
  [Profession.HERBALIST]: { type: Profession.HERBALIST, name: 'Herbalist', tool: false },
  [Profession.VENDOR]: { type: Profession.VENDOR, name: 'Vendor', tool: false },
  [Profession.TEACHER]: { type: Profession.TEACHER, name: 'Teacher', tool: false },
  [Profession.TRADER]: { type: Profession.TRADER, name: 'Trader', tool: false },
  [Profession.BUILDER]: { type: Profession.BUILDER, name: 'Builder', tool: true },
};
