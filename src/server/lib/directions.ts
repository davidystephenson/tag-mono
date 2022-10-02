import { SQRT_ONE_2 } from './fractions'

export const NORTH_VECTOR = { x: 0, y: -1 }
export const NORTH_E_VECTOR = { x: SQRT_ONE_2, y: -SQRT_ONE_2 }
export const EAST_VECTOR = { x: 1, y: 0 }
export const SOUTH_E_VECTOR = { x: SQRT_ONE_2, y: SQRT_ONE_2 }
export const SOUTH_VECTOR = { x: 0, y: 1 }
export const SOUTH_W_VECTOR = { x: -SQRT_ONE_2, y: SQRT_ONE_2 }
export const WEST_VECTOR = { x: -1, y: 0 }
export const NORTH_W_VECTOR = { x: -SQRT_ONE_2, y: -SQRT_ONE_2 }
export const compassDirections = [
  NORTH_VECTOR,
  NORTH_E_VECTOR,
  EAST_VECTOR,
  SOUTH_E_VECTOR,
  SOUTH_VECTOR,
  SOUTH_W_VECTOR,
  WEST_VECTOR,
  NORTH_W_VECTOR
]
