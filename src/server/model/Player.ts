import Character from './Character'
import Controls, { Control, controlValues } from '../../shared/controls'
import { DEBUG } from '../lib/debug'
import Stage from './Stage'

export default class Player extends Character {
  static players = new Map<string, Player>()

  readonly id: string
  constructor ({
    color = 'green',
    id,
    observer,
    radius = 15,
    stage,
    x = 0,
    y = 0
  }: {
    color?: string
    id: string
    observer?: boolean
    radius?: number
    stage: Stage
    x: number
    y: number
  }) {
    super({ x, y, color, radius, stage })
    if (observer === true) {
      this.observer = true
      this.loseReady()
    }
    this.id = id
    Player.players.set(this.id, this)
  }

  updateControls (controls: Controls): void {
    let key: Control
    for (key in controls) {
      const isControl = controlValues.has(key)
      if (!isControl) return console.warn('Control is not a value:', key)
      const control = controls[key]
      const isBoolean = typeof control === 'boolean'
      if (!isBoolean) return console.warn('Control is not a boolean:', this.feature.body.id, control)
      this.controls[key] = control
    }
  }

  act (): void {
    // this.debugPath()
    super.act()
    if (DEBUG.OPEN_WAYPOINTS) {
      const visible = this.stage.waypoints.filter(waypoint => {
        return this.isPointWallOpen({ point: waypoint.position })
      })
      visible.forEach(waypoint => {
        this.stage.line({
          color: 'black',
          end: waypoint.position,
          start: this.feature.body.position
        })
      })
    }
    if (DEBUG.POSITION) {
      console.log('player position', this.feature.body.position)
    }
    if (DEBUG.SPEED) {
      console.log('player speed', this.feature.body.speed)
    }
  }
}
