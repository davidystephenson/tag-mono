import Matter from 'matter-js'
import RectangleFeature from './RectangleFeature'
import Stage from './Stage'

export default class Crate extends RectangleFeature {
  constructor ({
    angle = 0,
    blue = 255,
    density = 0.00005,
    green = 255,
    height = 10,
    red = 0,
    stage,
    width = 10,
    x = 0,
    y = 0
  }: {
    angle?: number
    blue?: number
    density?: number
    green?: number
    height: number
    red?: number
    stage: Stage
    width: number
    x: number
    y: number
  }) {
    super({ blue, density, green, height, red, stage, width, x, y })
    this.body.label = 'brick'
    Matter.Body.setAngle(this.body, angle)
  }
}
