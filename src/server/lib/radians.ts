import Controls, { UP, UP_RIGHT, RIGHT, DOWN_RIGHT, DOWN, DOWN_LEFT, LEFT, UP_LEFT } from '../../shared/controls'
import { FIVE_8, ONE_8, SEVEN_8, THREE_8, ONE_4, ONE_2, THREE_4 } from './fractions'

export const ONE_8_PI = ONE_8 * Math.PI
export const ONE_4_PI = ONE_4 * Math.PI
export const THREE_8_PI = THREE_8 * Math.PI
export const ONE_2_PI = ONE_2 * Math.PI
export const FIVE_8_PI = FIVE_8 * Math.PI
export const THREE_4_PI = THREE_4 * Math.PI
export const SEVEN_8_PI = SEVEN_8 * Math.PI

export const ONE_O_CLOCK = -THREE_8_PI
export const TWO_O_CLOCK = -ONE_8_PI
export const THREE_O_CLOCK = 0
export const FOUR_O_CLOCK = ONE_8_PI
export const FIVE_O_CLOCK = THREE_8_PI
export const SIX_O_CLOCK = ONE_2_PI
export const SEVEN_O_CLOCK = FIVE_8_PI
export const EIGHT_O_CLOCK = SEVEN_8_PI
export const NINE_O_CLOCK = Math.PI // -Math.PI
export const TEN_O_CLOCK = -SEVEN_8_PI
export const ELEVEN_O_CLOCK = -FIVE_8_PI
export const TWELVE_O_CLOCK = -ONE_2_PI

export function areRadiansUp (radians: number): boolean {
  return ELEVEN_O_CLOCK <= radians && radians < ONE_O_CLOCK
}

export function areRadiansUpRight (radians: number): boolean {
  return ONE_O_CLOCK <= radians && radians < TWO_O_CLOCK
}

export function areRadiansRight (radians: number): boolean {
  return TWO_O_CLOCK <= radians && radians < FOUR_O_CLOCK
}

export function areRadiansDownRight (radians: number): boolean {
  return FOUR_O_CLOCK <= radians && radians < FIVE_O_CLOCK
}

export function areRadiansDown (radians: number): boolean {
  return FIVE_O_CLOCK <= radians && radians < SEVEN_O_CLOCK
}

export function areRadiansDownLeft (radians: number): boolean {
  return SEVEN_O_CLOCK <= radians && radians < EIGHT_O_CLOCK
}

export function areRadiansLeft (radians: number): boolean {
  const positive = EIGHT_O_CLOCK <= radians && radians < NINE_O_CLOCK

  return positive || (-NINE_O_CLOCK <= radians && radians < TEN_O_CLOCK)
}

export function areRadiansUpLeft (radians: number): boolean {
  return TEN_O_CLOCK <= radians && radians < ELEVEN_O_CLOCK
}

export function getRadiansInput (radians: number): Partial<Controls> {
  if (areRadiansUp(radians)) return UP
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
