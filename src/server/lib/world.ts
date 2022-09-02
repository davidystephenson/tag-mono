import Character from '../model/Character'

export const INITIAL = {
  WAYPOINT_BOTS: true,
  CENTER_BOT: true,
  CORNER_BOTS: false,
  MIDPOINT_BOTS: true,
  BRICKS: true,
  PUPPETS: true
}
export const WORLD_SIZE = 3000
export const HALF_WORLD_SIZE = WORLD_SIZE / 2
export const WORLD_MARGIN = HALF_WORLD_SIZE - Character.MARGIN
