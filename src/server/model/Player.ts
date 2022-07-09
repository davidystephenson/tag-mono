import Matter from 'matter-js'
import Input from '../../shared/Input'
import Fighter from './Fighter'

export default class Player extends Fighter {
  static paused = false
  static players = new Map<string, Player>()
  readonly socketId: string
  input = new Input()
  direction: Matter.Vector

  constructor ({ x = 0, y = 0, socketId }: {
    x: number
    y: number
    socketId: string
  }) {
    super({ x, y })
    this.socketId = socketId
    this.direction = { x: 0, y: 0 }
    Player.players.set(this.socketId, this)
  }

  destroy (): void {
    super.destroy()
    Player.players.delete(this.socketId)
  }
}
