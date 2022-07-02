import Matter from 'matter-js'
import { Input } from '../types'

export interface State {
  vertices: Matter.Vector[]
  wall: Matter.Vector[]
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
