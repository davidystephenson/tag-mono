import Character from './Character'
import { Socket } from 'socket.io'
import Shape from '../../shared/Shape'
import DebugLine from '../../shared/DebugLine'

export default class Player extends Character {
  static players = new Map<string, Player>()
  readonly socket: Socket

  constructor ({ x = 0, y = 0, socket, radius = 15, angle = 0, color = 'green' }: {
    x: number
    y: number
    socket: Socket
    angle?: number
    color?: string
    radius?: number
  }) {
    super({ x, y, angle, color })

    this.socket = socket
    Player.players.set(this.socket.id, this)
  }

  updateClient ({ compounds, obstacles }: {
    compounds: Matter.Body[]
    obstacles: Matter.Body[]
  }): void {
    const visibleCompounds = this.getVisibleCompounds({ compounds, obstacles })
    const shapes = Shape.fromCompounds(visibleCompounds)
    const message = { shapes, debugLines: DebugLine.lines, torsoId: this.torso.id }

    this.socket.emit('updateClient', message)
  }
}
