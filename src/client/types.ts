import Matter from 'matter-js'
import { Input, Shape } from '../types'

export interface State {
  shapes: Shape[]
  id?: string
}

export interface Camera {
  zoom: number
  scale: number
  x: number
  y: number
}

export interface Control {
  key: string
  input: keyof Input
}
