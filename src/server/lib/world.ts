import Character from '../model/Character'

export const INITIAL = {
  BRICKS: false,
  CENTER_BOT: true,
  CORNER_BOTS: true,
  GREEK_WALLS: true,
  GREEK_BOTS: true,
  GRID_BOTS: true,
  TOWN_BOTS: false,
  TOWN_WALLS: true,
  MIDPOINT_BOTS: true,
  PUPPETS: false,
  COUNTRY_WALLS: true,
  COUNTRY_BOTS: true,
  WAYPOINT_BOTS: false,
  WAYPOINT_BRICKS: true
}
export const WORLD_SIZE = 3000
export const HALF_WORLD_SIZE = WORLD_SIZE / 2
export const WORLD_MARGIN = HALF_WORLD_SIZE - Character.MARGIN
export const OBSERVER = false
