import Character from './Character'
import Shape from '../../shared/Shape'
import DebugLine from '../../shared/DebugLine'
import DebugCircle from '../../shared/DebugCircle'
import DebugLabel from '../../shared/DebugLabel'
import Wall from './Wall'
import Waypoint from './Waypoint'
import Controls, { Control, controlValues } from '../../shared/controls'
import { DEBUG } from '../lib/debug'

export default class Player extends Character {
  static players = new Map<string, Player>()
  readonly id: string

  constructor ({
    color = 'green',
    id,
    observer,
    radius = 15,
    x = 0,
    y = 0
  }: {
    color?: string
    id: string
    observer?: boolean
    radius?: number
    x: number
    y: number
  }) {
    super({ x, y, color, radius })
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

  updateClient (): void {
    const visibleFeatures = this.getVisibleFeatures()
    const shapes = visibleFeatures.map(feature => new Shape(feature.body))
    const message = {
      shapes,
      debugLines: DebugLine.lines,
      debugCircles: DebugCircle.circles,
      debugLabels: DebugLabel.labels,
      torsoId: this.feature.body.id
    }
    console.log(message)
  }

  act (): void {
    // this.debugPath()
    super.act()
    if (DEBUG.CLEAR_WAYPOINTS) {
      const visible = Waypoint.waypoints.filter(waypoint => {
        return Wall.isPointOpen({ start: this.feature.body.position, end: waypoint.position, radius: this.radius })
      })
      visible.forEach(waypoint => {
        void new DebugLine({ start: this.feature.body.position, end: waypoint.position, color: 'black' })
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
