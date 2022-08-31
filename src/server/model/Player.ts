import Character from './Character'
import { Socket } from 'socket.io'
import Shape from '../../shared/Shape'
import DebugLine from '../../shared/DebugLine'
import DebugCircle from '../../shared/DebugCircle'
import DebugLabel from '../../shared/DebugLabel'
import Wall from './Wall'
import Waypoint from './Waypoint'
import Controls, { Control, controlValues } from '../../shared/controls'

export default class Player extends Character {
  static DEBUG_POSITION = false
  static DEBUG_SPEED = false
  static DEBUG_CLEAR_WAYPOINTS = false
  static OBSERVER = false
  static players = new Map<string, Player>()
  readonly socket: Socket

  constructor ({ x = 0, y = 0, socket, radius = 15, color = 'green' }: {
    x: number
    y: number
    socket: Socket
    angle?: number
    color?: string
    radius?: number
  }) {
    super({ x, y, color, radius })
    if (Player.OBSERVER) {
      this.taggable = false
      this.observer = true
      this.feature.body.render.fillStyle = 'white'
    }
    this.socket = socket
    Player.players.set(this.socket.id, this)
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
    this.socket.emit('updateClient', message)
  }

  act (): void {
    super.act()
    if (Player.DEBUG_CLEAR_WAYPOINTS) {
      const visible = Waypoint.waypoints.filter(waypoint => {
        return Wall.isPointOpen({ start: this.feature.body.position, end: waypoint.position, radius: this.radius })
      })
      visible.forEach(waypoint => {
        void new DebugLine({ start: this.feature.body.position, end: waypoint.position, color: 'black' })
      })
    }
    if (Player.DEBUG_POSITION) {
      console.log('player position', this.feature.body.position)
    }
    if (Player.DEBUG_SPEED) {
      console.log('player speed', this.feature.body.speed)
    }
  }
}
