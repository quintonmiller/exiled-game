import {
  BuildingType, PersonalityTrait, Profession,
  PROFESSION_SKILL_MAP, SKILL_XP_PER_WORK_TICK,
  SKILL_XP_PER_LEVEL, SKILL_MAX_LEVEL,
  TRAIT_WORK_SPEED_BONUS, COOKED_FOOD_TYPES,
  AI_TICK_INTERVAL,
} from '../../constants';

/** Building types that use the physical gather-carry-deposit cycle */
export const GATHER_BUILDING_TYPES = new Set<string>([
  BuildingType.GATHERING_HUT,
  BuildingType.GATHERING_LODGE,
  BuildingType.HUNTING_CABIN,
  BuildingType.HUNTING_LODGE,
  BuildingType.FISHING_DOCK,
  BuildingType.HERBALIST,
  BuildingType.FORESTER_LODGE,
  BuildingType.FORESTRY_HALL,
]);

/** Building types that use the hybrid surface+underground mine cycle */
export const MINE_BUILDING_TYPES = new Set<string>([
  BuildingType.QUARRY,
  BuildingType.MINE,
]);

/** Cache: building type -> readable activity label */
export const BUILDING_ACTIVITY_LABELS: Record<string, string> = {
  [BuildingType.GATHERING_HUT]: 'foraging',
  [BuildingType.GATHERING_LODGE]: 'foraging',
  [BuildingType.HUNTING_CABIN]: 'hunting game',
  [BuildingType.HUNTING_LODGE]: 'hunting game',
  [BuildingType.FISHING_DOCK]: 'fishing',
  [BuildingType.FORESTER_LODGE]: 'felling trees',
  [BuildingType.FORESTRY_HALL]: 'felling trees',
  [BuildingType.HERBALIST]: 'gathering herbs',
  [BuildingType.WOOD_CUTTER]: 'splitting wood',
  [BuildingType.SAWMILL]: 'sawing lumber',
  [BuildingType.BLACKSMITH]: 'forging tools',
  [BuildingType.IRON_WORKS]: 'forging tools',
  [BuildingType.TAILOR]: 'sewing',
  [BuildingType.CROP_FIELD]: 'tending crops',
  [BuildingType.BAKERY]: 'cooking',
  [BuildingType.MARKET]: 'selling goods',
  [BuildingType.SCHOOL]: 'teaching',
  [BuildingType.ACADEMY]: 'teaching',
  [BuildingType.TRADING_POST]: 'trading',
  [BuildingType.TAVERN]: 'tending bar',
  [BuildingType.CHICKEN_COOP]: 'tending chickens',
  [BuildingType.PASTURE]: 'herding cattle',
  [BuildingType.DAIRY]: 'making cheese',
  [BuildingType.QUARRY]: 'quarrying stone',
  [BuildingType.MINE]: 'mining iron',
};

/** Grant skill XP to a worker based on their current profession */
export function grantSkillXP(worker: any): void {
  const skillType = PROFESSION_SKILL_MAP[worker.profession];
  if (!skillType) return;

  if (!worker.skills) worker.skills = {};
  if (!worker.skills[skillType]) worker.skills[skillType] = { xp: 0, level: 0 };

  const skill = worker.skills[skillType];
  if (skill.level >= SKILL_MAX_LEVEL) return;

  skill.xp += SKILL_XP_PER_WORK_TICK * AI_TICK_INTERVAL;
  if (skill.xp >= SKILL_XP_PER_LEVEL) {
    skill.xp -= SKILL_XP_PER_LEVEL;
    skill.level = Math.min(SKILL_MAX_LEVEL, skill.level + 1);
  }
}

/** Get trait multiplier for a given trait map */
export function getTraitMult(citizen: any, traitMap: Partial<Record<PersonalityTrait, number>>): number {
  const traits: string[] = citizen.traits || [];
  let mult = 1;
  for (const t of traits) {
    const v = traitMap[t as PersonalityTrait];
    if (v !== undefined) mult *= v;
  }
  return mult;
}

/** Check if citizen has a specific trait */
export function hasTrait(citizen: any, trait: PersonalityTrait): boolean {
  return (citizen.traits || []).includes(trait);
}

/** Check if a food type is cooked */
export function isCooked(type: string): boolean {
  return (COOKED_FOOD_TYPES as readonly string[]).includes(type);
}

/** Map profession to activity label */
export function professionActivity(profession: string): string {
  switch (profession) {
    case Profession.FARMER: return 'farming';
    case Profession.GATHERER: return 'gathering';
    case Profession.HUNTER: return 'hunting';
    case Profession.FISHERMAN: return 'fishing';
    case Profession.FORESTER: return 'forestry';
    case Profession.WOOD_CUTTER: return 'woodcutting';
    case Profession.BLACKSMITH: return 'smithing';
    case Profession.TAILOR: return 'tailoring';
    case Profession.HERBALIST: return 'healing';
    case Profession.VENDOR: return 'vending';
    case Profession.TEACHER: return 'teaching';
    case Profession.TRADER: return 'trading';
    case Profession.BUILDER: return 'building';
    case Profession.BAKER: return 'baking';
    case Profession.BARKEEP: return 'serving';
    case Profession.HERDER: return 'herding';
    case Profession.DAIRYMAID: return 'dairying';
    case Profession.MINER: return 'mining';
    default: return 'working';
  }
}

/** Get the worker's skill level for their current profession */
export function getWorkerSkillLevel(worker: any): number {
  const skillType = PROFESSION_SKILL_MAP[worker.profession];
  if (!skillType || !worker.skills?.[skillType]) return 0;
  return worker.skills[skillType].level;
}

/** Get trait-based work speed bonus for a single citizen */
export function getCitizenTraitBonus(citizen: any): number {
  const traits: string[] = citizen.traits || [];
  let bonus = 0;
  for (const t of traits) {
    const v = TRAIT_WORK_SPEED_BONUS[t as PersonalityTrait];
    if (v !== undefined) bonus += v;
  }
  return bonus;
}
