import Matter from 'matter-js'
import { VISION_INNER } from '../shared/VISION'
import Bot from './Bot'
import Character from './Character'
import RectangleFeature from './RectangleFeature'
import Stage from './Stage'
import Waypoint from './Waypoint'

export default class Wall extends RectangleFeature {
  readonly x: number
  readonly y: number
  readonly halfWidth: number
  readonly halfHeight: number
  readonly leftSide: number
  readonly rightSide: number
  readonly topSide: number
  readonly bottomSide: number
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
    this.halfWidth = this.width / 2
    this.halfHeight = this.height / 2
    this.leftSide = this.x - this.halfWidth
    this.rightSide = this.x + this.halfWidth
    this.topSide = this.y - this.halfHeight
    this.bottomSide = this.y + this.halfHeight
    Matter.Body.setStatic(this.body, true)
    this.stage.walls.push(this)
    this.stage.wallBodies.push(this.body)
    if (waypoints) {
      stage.radii.forEach(radius => {
        const margin = radius + 1
        const leftMargin = this.leftSide - margin
        const rightMargin = this.rightSide + margin
        const topMargin = this.topSide - margin
        const bottomMargin = this.bottomSide + margin
        this.body.vertices.forEach(corner => {
          const isLeft = corner.x < this.x
          const isTop = corner.y < this.y
          if (isLeft) {
            if (isTop) {
              void new Waypoint({ stage: this.stage, x: leftMargin, y: topMargin, radius })
            } else {
              void new Waypoint({ stage: this.stage, x: leftMargin, y: bottomMargin, radius })
            }
          } else {
            if (isTop) {
              void new Waypoint({ stage: this.stage, x: rightMargin, y: topMargin, radius })
            } else {
              void new Waypoint({ stage: this.stage, x: rightMargin, y: bottomMargin, radius })
            }
          }
        })
        if (this.height > VISION_INNER.height) {
          let factor = 2
          let segment = this.height / factor
          while (segment > VISION_INNER.height) {
            factor = factor + 1
            segment = this.height / factor
          }
          for (let i = 1; i < factor; i++) {
            const y = this.topSide + (this.height / factor) * i
            void new Waypoint({ stage: this.stage, x: leftMargin, y, radius })
            void new Waypoint({ stage: this.stage, x: rightMargin, y, radius })
          }
        }
        if (this.width > VISION_INNER.width) {
          let factor = 2
          let segment = this.width / factor
          while (segment > VISION_INNER.width) {
            factor = factor + 1
            segment = this.width / factor
          }
          for (let i = 1; i < factor; i++) {
            const x = this.leftSide + (this.width / factor) * i
            const top = topMargin
            void new Waypoint({ stage: this.stage, x, y: top, radius })

            const bottom = bottomMargin
            void new Waypoint({ stage: this.stage, x, y: bottom, radius })
          }
        }
      })
    }
  }

  spawnBots (): void {
    const leftMargin = this.leftSide - Character.MARGIN
    const rightMargin = this.rightSide + Character.MARGIN
    const topMargin = this.topSide - Character.MARGIN
    const bottomMargin = this.bottomSide + Character.MARGIN
    void new Bot({ x: leftMargin, y: topMargin, stage: this.stage })
    void new Bot({ x: leftMargin, y: bottomMargin, stage: this.stage })
    void new Bot({ x: rightMargin, y: topMargin, stage: this.stage })
    void new Bot({ x: rightMargin, y: bottomMargin, stage: this.stage })
  }

  isVisible ({ center, radius }: {
    center: Matter.Vector
    radius: number
  }): boolean {
    return true
  }
}
