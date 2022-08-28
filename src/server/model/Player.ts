import Character from './Character'
import { Socket } from 'socket.io'
import Shape from '../../shared/Shape'
import DebugLine from '../../shared/DebugLine'
import DebugCircle from '../../shared/DebugCircle'
import DebugLabel from '../../shared/DebugLabel'

export default class Player extends Character {
  static players = new Map<string, Player>()
  static LOG_POSITION = false
  readonly socket: Socket

  constructor ({ x = 0, y = 0, socket, radius = 15, color = 'white' }: {
    x: number
    y: number
    socket: Socket
    angle?: number
    color?: string
    radius?: number
  }) {
    super({ x, y, color })
    this.controllable = false

    this.socket = socket
    Player.players.set(this.socket.id, this)
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
    if (Player.LOG_POSITION) {
      console.log('player position', this.feature.body.position)
    }
  }
}
