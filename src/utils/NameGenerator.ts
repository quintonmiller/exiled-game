import { Random } from '../core/Random';
import { FEMALE_FIRST_NAMES, LAST_NAMES, MALE_FIRST_NAMES } from '../data/NamePools';

export interface GeneratedCitizenName {
  firstName: string;
  lastName: string;
  name: string;
}

export function formatCitizenName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

export function generateCitizenName(rng: Random, isMale: boolean): GeneratedCitizenName {
  const firstName = rng.pick(isMale ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES);
  const lastName = rng.pick(LAST_NAMES);
  return {
    firstName,
    lastName,
    name: formatCitizenName(firstName, lastName),
  };
}
