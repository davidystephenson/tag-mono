export const ONE_8 = 1 / 8
export const ONE_4 = 1 / 4
export const THREE_8 = 3 / 8
export const ONE_2 = 1 / 2
export const FIVE_8 = 5 / 8
export const THREE_4 = 3 / 4
export const SEVEN_8 = 7 / 8

export const SQRT_ONE_2 = Math.sqrt(ONE_2)

export const NORTH_VECTOR = { x: 0, y: -1 }
export const NORTH_E_VECTOR = { x: SQRT_ONE_2, y: -SQRT_ONE_2 }
export const EAST_VECTOR = { x: 1, y: 0 }
export const SOUTH_E_VECTOR = { x: SQRT_ONE_2, y: SQRT_ONE_2 }
export const SOUTH_VECTOR = { x: 0, y: 1 }
export const SOUTH_W_VECTOR = { x: -SQRT_ONE_2, y: SQRT_ONE_2 }
export const WEST_VECTOR = { x: -1, y: 0 }
export const NORTH_W_VECTOR = { x: -SQRT_ONE_2, y: -SQRT_ONE_2 }

export const ONE_8_PI = ONE_8 * Math.PI
export const ONE_4_PI = ONE_4 * Math.PI
export const THREE_8_PI = THREE_8 * Math.PI
export const ONE_2_PI = ONE_2 * Math.PI
export const FIVE_8_PI = FIVE_8 * Math.PI
export const THREE_4_PI = THREE_4 * Math.PI
export const SEVEN_8_PI = SEVEN_8 * Math.PI

export const NORTH_NE_RADIANS = -THREE_8_PI
export const EAST_NE_RADIANS = -ONE_8_PI
export const EAST_RADIANS = 0
export const EAST_SE_RADIANS = ONE_8_PI
export const SOUTH_SE_RADIANS = THREE_8_PI
export const SOUTH_RADIANS = ONE_2_PI
export const SOUTH_SW_RADIANS = FIVE_8_PI
export const WEST_SW_RADIANS = SEVEN_8_PI
export const WEST_RADIANS = Math.PI // -Math.PI
export const WEST_NW_RADIANS = -SEVEN_8_PI
export const NORTH_NW_RADIANS = -FIVE_8_PI
export const NORTH_RADIANS = -ONE_2_PI

export function areRadiansUp (radians: number): boolean {
  return NORTH_NW_RADIANS <= radians && radians < NORTH_NE_RADIANS
}

export function areRadiansUpRight (radians: number): boolean {
  return NORTH_NE_RADIANS <= radians && radians < EAST_NE_RADIANS
}

export function areRadiansRight (radians: number): boolean {
  return EAST_NE_RADIANS <= radians && radians < EAST_SE_RADIANS
}

export function areRadiansDownRight (radians: number): boolean {
  return EAST_SE_RADIANS <= radians && radians < SOUTH_SE_RADIANS
}

export function areRadiansDown (radians: number): boolean {
  return SOUTH_SE_RADIANS <= radians && radians < SOUTH_SW_RADIANS
}

export function areRadiansDownLeft (radians: number): boolean {
  return SOUTH_SW_RADIANS <= radians && radians < WEST_SW_RADIANS
}

export function areRadiansLeft (radians: number): boolean {
  const positive = WEST_SW_RADIANS <= radians && radians <= WEST_RADIANS

  return positive || (-WEST_RADIANS <= radians && radians <= WEST_NW_RADIANS)
}

export function areRadiansUpLeft (radians: number): boolean {
  return WEST_NW_RADIANS <= radians && radians < NORTH_NW_RADIANS
}

const DIRECTIONAL_KEYS = ['UP', 'UP_RIGHT', 'RIGHT', 'DOWN_RIGHT', 'DOWN', 'DOWN_LEFT', 'LEFT', 'UP_LEFT']
type DirectionalKey = typeof DIRECTIONAL_KEYS[number]
type Directionals <Directional> = Record<DirectionalKey, Directional>
export function getDirectional <Directional> ({ radians, directionals }: {
  radians: number
  directionals: Directionals<Directional>
}): Directional {
  if (areRadiansUp(radians)) return directionals.UP
  if (areRadiansUpRight(radians)) return directionals.UP_RIGHT
  if (areRadiansRight(radians)) return directionals.RIGHT
  if (areRadiansDownRight(radians)) return directionals.DOWN_RIGHT
  if (areRadiansDown(radians)) return directionals.DOWN
  if (areRadiansDownLeft(radians)) return directionals.DOWN_LEFT
  if (areRadiansLeft(radians)) return directionals.LEFT
  if (areRadiansUpLeft(radians)) return directionals.UP_LEFT

  const string = String(radians)
  throw new Error(`Invalid radians: ${string}`)
}

export function vectorToPoint (vector: Matter.Vector): Matter.Vector {
  return { x: vector.x, y: vector.y }
}
