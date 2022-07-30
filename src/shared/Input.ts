export default class Input {
  up ?= false
  down ?= false
  left ?= false
  right ?= false
  select ?= false
}

export const UP_INPUT: Input = {
  up: true,
  down: false,
  left: false,
  right: false
}

export const DOWN_INPUT: Input = {
  up: false,
  down: true,
  left: false,
  right: false
}

export const LEFT_INPUT: Input = {
  up: false,
  down: false,
  left: true,
  right: false
}

export const RIGHT_INPUT: Input = {
  up: false,
  down: false,
  left: false,
  right: true
}

export const UP_LEFT_INPUT: Input = {
  up: true,
  down: false,
  left: true,
  right: false
}

export const UP_RIGHT_INPUT: Input = {
  up: true,
  down: false,
  left: false,
  right: true
}

export const DOWN_LEFT_INPUT: Input = {
  up: false,
  down: true,
  left: true,
  right: false
}

export const DOWN_RIGHT_INPUT: Input = {
  up: false,
  down: true,
  left: false,
  right: true
}

export const STILL_INPUT: Input = {
  up: false,
  down: false,
  left: false,
  right: false
}
