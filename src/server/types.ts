import Matter from 'matter-js'
import { Input } from '../types'
import { Actor } from './models/Actor'

export interface State {
  paused: boolean
}

export interface Player {
  id: string
  input: Input
  direction: Matter.Vector
  actor?: Actor
}
