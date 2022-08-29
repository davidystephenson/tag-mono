import Matter from 'matter-js'
import { VISION_INNER_HEIGHT, VISION_INNER_WIDTH } from '../../shared/VISION'
import { isEveryCastClear } from '../lib/raycast'
import RectangleFeature from './RectangleFeature'
import Waypoint from './Waypoint'

export default class Wall extends RectangleFeature {
  static walls: Wall[] = []
  static wallObstacles: Matter.Body[] = []
  static BUFFER = 45
  static isPointClear ({ start, end, radius, debug }: {
    start: Matter.Vector
    end: Matter.Vector
    radius: number
    debug?: boolean
  }): boolean {
    const toArrow = Matter.Vector.sub(end, start)
    const toDirection = Matter.Vector.normalise(toArrow)
    const toPerp = Matter.Vector.perp(toDirection)
    const startPerp = Matter.Vector.mult(toPerp, radius - 1)
    const leftStart = Matter.Vector.add(start, startPerp)
    const rightStart = Matter.Vector.sub(start, startPerp)

    const leftEnd = Matter.Vector.add(end, startPerp)
    const rightEnd = Matter.Vector.sub(end, startPerp)
    const left = [leftStart, leftEnd]
    const right = [rightStart, rightEnd]
    const casts = [left, right]

    return isEveryCastClear({ casts, obstacles: Wall.wallObstacles, debug })
  }

  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly halfWidth: number
  readonly halfHeight: number
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
    this.halfWidth = this.width / 2
    this.halfHeight = this.height / 2
    this.body.render.fillStyle = 'blue'
    Matter.Body.setStatic(this.body, true)
    Wall.walls.push(this)
    Wall.wallObstacles.push(this.body)
    if (waypoints) {
      this.body.vertices.forEach(corner => {
        const direction = Matter.Vector.normalise({
          x: Math.sign(corner.x - this.body.position.x),
          y: Math.sign(corner.y - this.body.position.y)
        })
        const away = Matter.Vector.mult(direction, Wall.BUFFER)
        const location = Matter.Vector.add(corner, away)
        void new Waypoint({ x: location.x, y: location.y })
      })
      if (this.height > VISION_INNER_HEIGHT) {
        let factor = 2
        let segment = this.height / factor
        while (segment > VISION_INNER_HEIGHT) {
          factor = factor + 1
          segment = this.height / factor
        }
        for (let i = 1; i < factor; i++) {
          const left = this.x - this.width / 2 - Wall.BUFFER
          const y = this.y - this.height / 2 + (this.height / factor) * i
          void new Waypoint({ x: left, y })

          const right = this.x + this.width / 2 + Wall.BUFFER
          void new Waypoint({ x: right, y })
        }
      }
      if (this.width > VISION_INNER_WIDTH) {
        let factor = 2
        let segment = this.width / factor
        while (segment > VISION_INNER_WIDTH) {
          factor = factor + 1
          segment = this.width / factor
        }
        for (let i = 1; i < factor; i++) {
          const x = this.x - this.width / 2 + (this.width / factor) * i
          const top = this.y - this.height / 2 - Wall.BUFFER
          void new Waypoint({ x, y: top })

          const bottom = this.y + this.height / 2 + Wall.BUFFER
          void new Waypoint({ x, y: bottom })
        }
      }
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
