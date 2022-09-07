import Character from '../model/Character'

export const INITIAL = {
  BRICKS: true,
  CENTER_BOT: true,
  CORNER_BOTS: true,
  MAZE_BOTS: true,
  MIDPOINT_BOTS: true,
  PUPPETS: true,
  WAYPOINT_BOTS: false
}
export const WORLD_SIZE = 3000
export const HALF_WORLD_SIZE = WORLD_SIZE / 2
export const WORLD_MARGIN = HALF_WORLD_SIZE - Character.MARGIN
