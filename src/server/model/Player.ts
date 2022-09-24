import Character from './Character'
import { Socket } from 'socket.io'
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
  readonly socket: Socket

  constructor ({
    color = 'green',
    observer,
    radius = 15,
    socket,
    x = 0,
    y = 0
  }: {
    color?: string
    observer?: boolean
    radius?: number
    socket: Socket
    x: number
    y: number
  }) {
    super({ x, y, color, radius })
    if (observer === true) {
      this.observer = true
      this.loseReady()
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

  // getDist (a: Matter.Vector, b: Matter.Vector): number {
  // const dx = b.x - a.x
  // const dy = b.y - a.y
  // return Math.sqrt(dx * dx + dy * dy)
  // }
//
  // debugPath (): void {
  // const here = this.feature.body.position
  // const distances = Waypoint.waypoints.map(waypoint => this.getDist(here, waypoint.position))
  // const startWaypoint = whichMin(Waypoint.waypoints, distances)
  // const path = startWaypoint.paths[34]
  // const originIndex = path.length - 1
  // path.slice(0, originIndex).forEach((point, i) => {
  // void new DebugLine({ start: point, end: path[i + 1], color: 'purple' })
  // })
  // void new DebugCircle({ x: path[0].x, y: path[0].y, radius: 10, color: 'red' })
  // void new DebugCircle({ x: path[originIndex].x, y: path[originIndex].y, radius: 10, color: 'green' })
//
  // const obstacles = Wall.wallObstacles
  // const start = here
  // const end = Waypoint.waypoints[34].position
  // const collisions = Matter.Query.ray(obstacles, start, end)
  // const clear = Wall.isPointOpen({ start, end, radius: this.radius, debug: true })
  // const color = clear ? 'green' : 'red'
  // void new DebugLine({ start, end, color })
  // }
}
