import type { DoorDef, DoorSide, Rotation } from '../types';

const SIDE_CW: Record<DoorSide, DoorSide> = {
  north: 'east',
  east: 'south',
  south: 'west',
  west: 'north',
};

/** Swap width/height for 90/270 rotations */
export function getRotatedDims(w: number, h: number, r: Rotation): { w: number; h: number } {
  return (r === 1 || r === 3) ? { w: h, h: w } : { w, h };
}

/** Transform a door's position and side through r 90-CW steps */
export function getRotatedDoor(door: DoorDef, origW: number, origH: number, r: Rotation): DoorDef {
  let dx = door.dx;
  let dy = door.dy;
  let side = door.side;
  let curH = origH;

  for (let i = 0; i < r; i++) {
    const newDx = curH - 1 - dy;
    const newDy = dx;
    dx = newDx;
    dy = newDy;
    side = SIDE_CW[side];
    // After a 90 CW step, the bounding box dims swap for the next iteration
    // curW was the width before this step, curH was the height
    // After rotation: new width = old height (curH), new height = old width
    // We only need curH for the formula, and after swap curH = old curW
    // But we need curW for next iteration's curH... track both
    // Actually: after one 90-CW step, dims swap. The formula uses the *current* height.
    // Current dims before step i: if i is even, (origW, origH), if i is odd, (origH, origW)
    // curH before step i=0: origH. After step: curH = origW (dims swapped)
    curH = (i % 2 === 0) ? origW : origH;
  }

  return { dx, dy, side };
}

/** Get the walkable tile just outside the door */
export function getDoorEntryTile(buildX: number, buildY: number, door: DoorDef): { x: number; y: number } {
  const doorTileX = buildX + door.dx;
  const doorTileY = buildY + door.dy;

  switch (door.side) {
    case 'south': return { x: doorTileX, y: doorTileY + 1 };
    case 'north': return { x: doorTileX, y: doorTileY - 1 };
    case 'east':  return { x: doorTileX + 1, y: doorTileY };
    case 'west':  return { x: doorTileX - 1, y: doorTileY };
  }
}
