import Controls, { Control, controlValues } from '../shared/controls'
import Character from './Character'
import Stage from './Stage'

export default class Player extends Character {
  static players = new Map<string, Player>()

  readonly id: string
  constructor ({
    id,
    observer,
    radius = 15,
    stage,
    x = 0,
    y = 0
  }: {
    id: string
    observer?: boolean
    radius?: number
    stage: Stage
    x: number
    y: number
  }) {
    super({ x, y, radius, stage })
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
    if (this.stage.debugOpenWaypoints) {
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
    if (this.stage.debugPosition) {
      console.log('player position', this.feature.body.position)
    }
    if (this.stage.debugSpeed) {
      console.log('player speed', this.feature.body.speed)
    }
  }
}
