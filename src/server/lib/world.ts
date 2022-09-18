import Character from '../model/Character'

export const INITIAL = {
  BRICKS: false,
  CENTER_BOT: true,
  CORNER_BOTS: false,
  GREEK_WALLS: true,
  GREEK_BOTS: false,
  GRID_BOTS: true,
  TOWN_BOTS: false,
  TOWN_WALLS: true,
  MIDPOINT_BOTS: true,
  PUPPETS: false,
  COUNTRY_WALLS: true,
  COUNTRY_BOTS: false,
  WAYPOINT_BOTS: false,
  WAYPOINT_BRICKS: false
}
export const WORLD_SIZE = 3000
export const HALF_WORLD_SIZE = WORLD_SIZE / 2
export const WORLD_MARGIN = HALF_WORLD_SIZE - Character.MARGIN
export const OBSERVER = false
