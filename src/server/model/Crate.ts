import Matter from 'matter-js'
import RectangleFeature from './RectangleFeature'

export default class Crate extends RectangleFeature {
  constructor ({ x = 0, y = 0, width = 10, height = 10, angle = 0, color = 'green' }: {
    x: number
    y: number
    width: number
    height: number
    angle?: number
    color?: string
  }) {
    super({ x, y, width, height })
    this.body.render.fillStyle = color
    this.body.label = 'crate'
    Matter.Body.setAngle(this.body, angle)
  }
}
