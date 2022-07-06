import Matter from 'matter-js'
import Input from '../../shared/Input'
import Fighter from './Fighter'

export const players = new Map<string, Player>()

export default class Player extends Fighter {
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
    players.set(this.socketId, this)
  }
}
