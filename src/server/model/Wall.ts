import Matter from 'matter-js'
import Actor from './Actor'

export default class Wall extends Actor {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  constructor ({ x = 0, y = 0, width = 100, height = 100 }: {
    x: number
    y: number
    width: number
    height: number
  }) {
    const body = Matter.Bodies.rectangle(x, y, width, height)
    super({ parts: [body] })
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    body.render.fillStyle = 'Purple'
    Matter.Body.setStatic(this.compound, true)
  }
}
