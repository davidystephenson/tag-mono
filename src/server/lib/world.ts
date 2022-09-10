import Character from '../model/Character'

export const INITIAL = {
  BRICKS: false,
  CENTER_BOT: true,
  CORNER_BOTS: false,
  MAZE_BOTS: true,
  MIDPOINT_BOTS: false,
  PUPPETS: false,
  WAYPOINT_BOTS: false
}
export const WORLD_SIZE = 3000
export const HALF_WORLD_SIZE = WORLD_SIZE / 2
export const WORLD_MARGIN = HALF_WORLD_SIZE - Character.MARGIN
