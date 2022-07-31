import Input, { DOWN, DOWN_LEFT, DOWN_RIGHT, LEFT, RIGHT, UP, UP_LEFT, UP_RIGHT } from '../../shared/Input'
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

export function isUp (radians: number): boolean {
  return ELEVEN_O_CLOCK <= radians && radians < ONE_O_CLOCK
}

export function isUpRight (radians: number): boolean {
  return ONE_O_CLOCK <= radians && radians < TWO_O_CLOCK
}

export function isRight (radians: number): boolean {
  return TWO_O_CLOCK <= radians && radians < FOUR_O_CLOCK
}

export function isDownRight (radians: number): boolean {
  return FOUR_O_CLOCK <= radians && radians < FIVE_O_CLOCK
}

export function isDown (radians: number): boolean {
  return FIVE_O_CLOCK <= radians && radians < SEVEN_O_CLOCK
}

export function isDownLeft (radians: number): boolean {
  return SEVEN_O_CLOCK <= radians && radians < EIGHT_O_CLOCK
}

export function isLeft (radians: number): boolean {
  const positive = EIGHT_O_CLOCK <= radians && radians < NINE_O_CLOCK

  return positive || (-NINE_O_CLOCK <= radians && radians < TEN_O_CLOCK)
}

export function isUpLeft (radians: number): boolean {
  return TEN_O_CLOCK <= radians && radians < ELEVEN_O_CLOCK
}

export function getRadiansInput (radians: number): Partial<Input> {
  if (isUp(radians)) return UP
  if (isUpRight(radians)) return UP_RIGHT
  if (isRight(radians)) return RIGHT
  if (isDownRight(radians)) return DOWN_RIGHT
  if (isDown(radians)) return DOWN
  if (isDownLeft(radians)) return DOWN_LEFT
  if (isLeft(radians)) return LEFT
  if (isUpLeft(radians)) return UP_LEFT

  const string = String(radians)
  throw new Error(`Invalid radians: ${string}`)
}
