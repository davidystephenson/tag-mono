export default class Input {
  up = false
  down = false
  left = false
  right = false
  select = false
}

export const UP: Partial<Input> = {
  up: true,
  down: false,
  left: false,
  right: false
}

export const DOWN: Partial<Input> = {
  up: false,
  down: true,
  left: false,
  right: false
}

export const LEFT: Partial<Input> = {
  up: false,
  down: false,
  left: true,
  right: false
}

export const RIGHT: Partial<Input> = {
  up: false,
  down: false,
  left: false,
  right: true
}

export const UP_LEFT: Partial<Input> = {
  up: true,
  down: false,
  left: true,
  right: false
}

export const UP_RIGHT: Partial<Input> = {
  up: true,
  down: false,
  left: false,
  right: true
}

export const DOWN_LEFT: Partial<Input> = {
  up: false,
  down: true,
  left: true,
  right: false
}

export const DOWN_RIGHT: Partial<Input> = {
  up: false,
  down: true,
  left: false,
  right: true
}

export const STILL: Partial<Input> = {
  up: false,
  down: false,
  left: false,
  right: false
}
