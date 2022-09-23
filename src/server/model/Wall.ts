import Matter from 'matter-js'
import { VISION_INNER_HEIGHT, VISION_INNER_WIDTH } from '../../shared/VISION'
import { isCircleShown, isPointClear, isPointOpen, isPointShown } from '../lib/raycast'
import Bot from './Bot'
import Character from './Character'
import RectangleFeature from './RectangleFeature'
import Waypoint from './Waypoint'

export default class Wall extends RectangleFeature {
  static walls: Wall[] = []
  static wallObstacles: Matter.Body[] = []
  static isPointClear ({ start, end, debug }: {
    start: Matter.Vector
    end: Matter.Vector
    debug?: boolean
  }): boolean {
    return isPointClear({ start, end, obstacles: Wall.wallObstacles, debug })
  }

  static isPointOpen ({ start, end, radius, debug }: {
    start: Matter.Vector
    end: Matter.Vector
    radius: number
    debug?: boolean
  }): boolean {
    return isPointOpen({
      start, end, radius, obstacles: Wall.wallObstacles, debug
    })
  }

  static isPointShown ({ start, end, radius, debug }: {
    start: Matter.Vector
    end: Matter.Vector
    radius: number
    debug?: boolean
  }): boolean {
    return isPointShown({
      start, end, radius, obstacles: Wall.wallObstacles, debug
    })
  }

  static isPointX ({ start, end, radius, body, debug }: {
    start: Matter.Vector
    end: Matter.Vector
    radius: number
    body: Matter.Body
    debug?: boolean
  }): boolean {
    const bodies = Wall.wallObstacles.filter(element => element !== body)
    return isPointShown({
      start, end, radius, obstacles: bodies, debug
    })
  }

  static isCircleShown ({ start, end, startRadius, endRadius, debug }: {
    start: Matter.Vector
    end: Matter.Vector
    startRadius: number
    endRadius: number
    debug?: boolean
  }): boolean {
    return isCircleShown({
      start, end, startRadius, endRadius, obstacles: Wall.wallObstacles, debug
    })
  }

  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly halfWidth: number
  readonly halfHeight: number
  readonly leftSide: number
  readonly rightSide: number
  readonly topSide: number
  readonly bottomSide: number
  readonly leftMargin: number
  readonly rightMargin: number
  readonly topMargin: number
  readonly bottomMargin: number
  constructor ({ x = 0, y = 0, width = 100, height = 100, waypoints = true, color = 'blue' }: {
    x: number
    y: number
    width: number
    height: number
    waypoints?: boolean
    color?: string
  }) {
    super({ x, y, width, height, color })
    this.body.label = 'wall'
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.halfWidth = this.width / 2
    this.halfHeight = this.height / 2
    this.leftSide = this.x - this.halfWidth
    this.rightSide = this.x + this.halfWidth
    this.topSide = this.y - this.halfHeight
    this.bottomSide = this.y + this.halfHeight
    this.leftMargin = this.leftSide - Character.MARGIN
    this.rightMargin = this.rightSide + Character.MARGIN
    this.topMargin = this.topSide - Character.MARGIN
    this.bottomMargin = this.bottomSide + Character.MARGIN
    Matter.Body.setStatic(this.body, true)
    Wall.walls.push(this)
    Wall.wallObstacles.push(this.body)
    if (waypoints) {
      this.body.vertices.forEach(corner => {
        const isLeft = corner.x < this.x
        const isTop = corner.y < this.y
        if (isLeft) {
          if (isTop) {
            void new Waypoint({ x: this.leftMargin, y: this.topMargin })
          } else {
            void new Waypoint({ x: this.leftMargin, y: this.bottomMargin })
          }
        } else {
          if (isTop) {
            void new Waypoint({ x: this.rightMargin, y: this.topMargin })
          } else {
            void new Waypoint({ x: this.rightMargin, y: this.bottomMargin })
          }
        }
      })
      if (this.height > VISION_INNER_HEIGHT) {
        let factor = 2
        let segment = this.height / factor
        while (segment > VISION_INNER_HEIGHT) {
          factor = factor + 1
          segment = this.height / factor
        }
        for (let i = 1; i < factor; i++) {
          const y = this.topSide + (this.height / factor) * i
          void new Waypoint({ x: this.leftMargin, y })
          void new Waypoint({ x: this.rightMargin, y })
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
          const x = this.leftSide + (this.width / factor) * i
          const top = this.topMargin
          void new Waypoint({ x, y: top })

          const bottom = this.bottomMargin
          void new Waypoint({ x, y: bottom })
        }
      }
    }
  }

  spawnBots (): void {
    void new Bot({ x: this.leftMargin, y: this.topMargin })
    void new Bot({ x: this.leftMargin, y: this.bottomMargin })
    void new Bot({ x: this.rightMargin, y: this.topMargin })
    void new Bot({ x: this.rightMargin, y: this.bottomMargin })
  }

  isVisible ({ center, radius }: {
    center: Matter.Vector
    radius: number
  }): boolean {
    return true
  }
}
