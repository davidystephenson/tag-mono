import Character from './Character'
import { Socket } from 'socket.io'
import Shape from '../../shared/Shape'
import DebugLine from '../../shared/DebugLine'

export default class Player extends Character {
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
    super({ x, y, color })

    this.socket = socket
    Player.players.set(this.socket.id, this)
  }

  updateClient (): void {
    const visibleFeatures = this.getVisibleFeatures()
    const shapes = visibleFeatures.map(feature => new Shape(feature.body))
    const message = { shapes, debugLines: DebugLine.lines, torsoId: this.feature.body.id }
    this.socket.emit('updateClient', message)
  }
}
