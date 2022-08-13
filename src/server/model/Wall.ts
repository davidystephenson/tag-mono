import Matter from 'matter-js'
import RectangleFeature from './RectangleFeature'
import Waypoint from './Waypoint'

export default class Wall extends RectangleFeature {
  static walls = new Map<number, Wall>()
  static wallObstacles: Matter.Body[] = []
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  constructor ({ x = 0, y = 0, width = 100, height = 100, waypoints = true }: {
    x: number
    y: number
    width: number
    height: number
    waypoints?: boolean
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
    if (waypoints) {
      this.body.vertices.forEach(corner => {
        const direction = Matter.Vector.normalise({
          x: Math.sign(corner.x - this.body.position.x),
          y: Math.sign(corner.y - this.body.position.y)
        })
        const away = Matter.Vector.mult(direction, 16)
        const location = Matter.Vector.add(corner, away)
        void new Waypoint({ x: location.x, y: location.y })
      })
    }
  }

  isVisible ({ center, viewpoints, obstacles }: {
    center: Matter.Vector
    viewpoints: Matter.Vector[]
    obstacles: Matter.Body[]
  }): boolean {
    return true
  }
}
