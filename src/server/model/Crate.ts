import Matter from 'matter-js'
import RectangleFeature from './RectangleFeature'

export default class Crate extends RectangleFeature {
  constructor ({
    angle = 0,
    color = 'gray',
    density = 0.00005,
    height = 10,
    width = 10,
    x = 0,
    y = 0
  }: {
    angle?: number
    color?: string
    density?: number
    height: number
    width: number
    x: number
    y: number
  }) {
    super({ color, density, height, width, x, y })
    this.body.label = 'brick'
    Matter.Body.setAngle(this.body, angle)
  }
}
