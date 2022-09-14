import Character from '../model/Character'

export const INITIAL = {
  BRICKS: true,
  CENTER_BOT: false,
  CORNER_BOTS: false,
  GREEK_BOTS: false,
  MAZE_BOTS: true,
  MIDPOINT_BOTS: true,
  PUPPETS: false,
  WAYPOINT_BOTS: false,
  WAYPOINT_BRICKS: false
}
export const WORLD_SIZE = 3000
export const HALF_WORLD_SIZE = WORLD_SIZE / 2
export const WORLD_MARGIN = HALF_WORLD_SIZE - Character.MARGIN
export const OBSERVER = false
