import Matter from 'matter-js'
import { Input } from '../types'

export interface State {
  direction: Matter.Vector
}

export interface Player {
  id: string
  input: Input
}

export interface Fighter {
  composite: Matter.Composite
}
