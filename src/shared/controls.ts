export const keyToControl = {
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  W: 'up',
  S: 'down',
  A: 'left',
  D: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'select',
  ' ': 'select'
} as const

export type ControlKey = keyof typeof keyToControl
export function isControlKey (key: string): key is ControlKey {
  return key in keyToControl
}

export type Control = typeof keyToControl[ControlKey]
type Controls = Record<Control, boolean>

export default Controls

export const UP: Partial<Controls> = {
  up: true,
  down: false,
  left: false,
  right: false
}

export const DOWN: Partial<Controls> = {
  up: false,
  down: true,
  left: false,
  right: false
}

export const LEFT: Partial<Controls> = {
  up: false,
  down: false,
  left: true,
  right: false
}

export const RIGHT: Partial<Controls> = {
  up: false,
  down: false,
  left: false,
  right: true
}

export const UP_LEFT: Partial<Controls> = {
  up: true,
  down: false,
  left: true,
  right: false
}

export const UP_RIGHT: Partial<Controls> = {
  up: true,
  down: false,
  left: false,
  right: true
}

export const DOWN_LEFT: Partial<Controls> = {
  up: false,
  down: true,
  left: true,
  right: false
}

export const DOWN_RIGHT: Partial<Controls> = {
  up: false,
  down: true,
  left: false,
  right: true
}

export const STILL: Partial<Controls> = {
  up: false,
  down: false,
  left: false,
  right: false
}
