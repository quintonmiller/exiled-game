# Housing Improvements

Tracking document for planned improvements to the house/housing system.

## Already Implemented
- Warmth system with firewood consumption (auto-restock at threshold 10, target 20)
- Smoke particles when fire is active
- Sleeping with proper wake conditions (energy full + daytime, or starving override)
- Building decay over ~28 years, evicting residents on collapse
- Couples assigned to same house automatically
- Conception requires both partners sleeping in same home
- Newborns added to mother's house if room available

## Planned Improvements

### 1. Flammability & Fire Spread
- **Status:** Not started
- **Description:** Wooden structures should have a chance of catching fire. Fire can spread to adjacent buildings. Citizens could fight fires as a priority action.
- **Notes:** Pairs well with existing drought weather event (higher fire chance during droughts). Could tie into a future stone house upgrade that has fire resistance.

### 2. Per-House Food Storage
- **Status:** Not started
- **Description:** Houses should store a small amount of food/ingredients accessible only to residents. Currently all food is global — citizens eat from a shared pool regardless of location.
- **Notes:** Creates interesting distribution dynamics (remote houses may struggle). Requires a hauling/delivery trip to restock, similar to how firewood should work.

### 3. Stone House Upgrade
- **Status:** Not started
- **Description:** Add a second house tier (stone house) with better durability, fire resistance, and improved warmth retention. Provides a housing progression path.
- **Notes:** Could require a builder with higher skill level or specific materials (more stone, iron nails).

### 4. Building Repair Mechanic
- **Status:** Not started
- **Description:** Citizens should be able to repair houses (and other buildings) before they collapse. Currently buildings just decay over 28 years with no intervention possible.
- **Notes:** Could be a laborer task or assigned maintenance worker. Repair could consume some materials (logs/stone). Adds another job priority to citizen AI.

### 5. Homeless Penalty
- **Status:** Not started
- **Description:** Citizens sleeping outside should suffer health and happiness penalties beyond just missing the warmth bonus. Being homeless should be a meaningful negative state.
- **Notes:** Could include: faster health decay, happiness penalty per night outside, increased disease susceptibility.

### 6. Overcrowding Penalty
- **Status:** Not started
- **Description:** Houses packed with unrelated adults should have a morale impact. A house of 5 strangers should feel different from a family of 3.
- **Notes:** Could grant a happiness bonus for living with family and a penalty when over a comfort threshold (e.g., >3 unrelated residents).

### 7. Physical Firewood Delivery
- **Status:** Not started
- **Description:** Firewood currently appears in houses instantly from the global pool. A citizen (hauler or resident) should physically carry firewood to the house.
- **Notes:** Ties into the broader per-house food storage idea — both require a delivery/hauling system. Could be a new hauler role or a resident errand.
