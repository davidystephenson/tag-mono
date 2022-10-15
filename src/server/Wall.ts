import Matter from 'matter-js'
import { VISION_INNER_HEIGHT, VISION_INNER_WIDTH } from '../shared/VISION'
import Bot from './Bot'
import Character from './Character'
import RectangleFeature from './RectangleFeature'
import Stage from './Stage'
import Waypoint from './Waypoint'

export default class Wall extends RectangleFeature {
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
  constructor ({ blue = 255, green = 0, height = 100, red = 0, stage, waypoints = true, width = 100, x = 0, y = 0 }: {
    blue?: number
    green?: number
    height: number
    red?: number
    stage: Stage
    waypoints?: boolean
    width: number
    x: number
    y: number
  }) {
    super({ blue, green, height, red, stage, width, x, y })
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
    this.stage.walls.push(this)
    this.stage.wallBodies.push(this.body)
    if (waypoints) {
      this.body.vertices.forEach(corner => {
        const isLeft = corner.x < this.x
        const isTop = corner.y < this.y
        if (isLeft) {
          if (isTop) {
            void new Waypoint({ stage: this.stage, x: this.leftMargin, y: this.topMargin })
          } else {
            void new Waypoint({ stage: this.stage, x: this.leftMargin, y: this.bottomMargin })
          }
        } else {
          if (isTop) {
            void new Waypoint({ stage: this.stage, x: this.rightMargin, y: this.topMargin })
          } else {
            void new Waypoint({ stage: this.stage, x: this.rightMargin, y: this.bottomMargin })
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
          void new Waypoint({ stage: this.stage, x: this.leftMargin, y })
          void new Waypoint({ stage: this.stage, x: this.rightMargin, y })
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
          void new Waypoint({ stage: this.stage, x, y: top })

          const bottom = this.bottomMargin
          void new Waypoint({ stage: this.stage, x, y: bottom })
        }
      }
    }
  }

  spawnBots (): void {
    void new Bot({ x: this.leftMargin, y: this.topMargin, stage: this.stage })
    void new Bot({ x: this.leftMargin, y: this.bottomMargin, stage: this.stage })
    void new Bot({ x: this.rightMargin, y: this.topMargin, stage: this.stage })
    void new Bot({ x: this.rightMargin, y: this.bottomMargin, stage: this.stage })
  }

  isVisible ({ center, radius }: {
    center: Matter.Vector
    radius: number
  }): boolean {
    return true
  }
}
