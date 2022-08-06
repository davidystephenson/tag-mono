import Matter from 'matter-js'
import RectangleFeature from './RectangleFeature'

export default class Wall extends RectangleFeature {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  constructor ({ x = 0, y = 0, width = 100, height = 100 }: {
    x: number
    y: number
    width: number
    height: number
  }) {
    super({ x, y, width, height })
    this.body.label = 'wall'
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.body.render.fillStyle = 'Purple'
    Matter.Body.setStatic(this.body, true)
  }

  isVisible ({ center, viewpoints, obstacles }: {
    center: Matter.Vector
    viewpoints: Matter.Vector[]
    obstacles: Matter.Body[]
  }): boolean {
    return true
  }
}
