import Controls, { UP, UP_RIGHT, RIGHT, DOWN_RIGHT, DOWN, DOWN_LEFT, LEFT, UP_LEFT } from '../../shared/controls'
import { FIVE_8, ONE_8, SEVEN_8, THREE_8, ONE_4, ONE_2, THREE_4 } from './fractions'

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
  const positive = WEST_SW_RADIANS <= radians && radians < WEST_RADIANS

  return positive || (-WEST_RADIANS <= radians && radians < WEST_NW_RADIANS)
}

export function areRadiansUpLeft (radians: number): boolean {
  return WEST_NW_RADIANS <= radians && radians < NORTH_NW_RADIANS
}

export function getRadiansInput (radians: number): Partial<Controls> {
  if (areRadiansUp(radians)) {
    return UP
  }
  if (areRadiansUpRight(radians)) return UP_RIGHT
  if (areRadiansRight(radians)) return RIGHT
  if (areRadiansDownRight(radians)) return DOWN_RIGHT
  if (areRadiansDown(radians)) return DOWN
  if (areRadiansDownLeft(radians)) return DOWN_LEFT
  if (areRadiansLeft(radians)) return LEFT
  if (areRadiansUpLeft(radians)) return UP_LEFT

  const string = String(radians)
  throw new Error(`Invalid radians: ${string}`)
}
