import Matter from 'matter-js'
import RectangleFeature from './RectangleFeature'

export default class Wall extends RectangleFeature {
  static walls = new Map<number, Wall>()
  static wallObstacles: Matter.Body[] = []
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
    Wall.walls.set(this.body.id, this)
    Wall.wallObstacles.push(this.body)
  }

  isVisible ({ center, viewpoints, obstacles }: {
    center: Matter.Vector
    viewpoints: Matter.Vector[]
    obstacles: Matter.Body[]
  }): boolean {
    return true
  }
}
