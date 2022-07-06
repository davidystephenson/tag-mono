import Matter from 'matter-js'

export default class Shape {
  readonly circleRadius?: number
  readonly x: number
  readonly y: number
  readonly vertices: Matter.Vector[]
  readonly render: Matter.IBodyRenderOptions

  constructor (body: Matter.Body) {
    this.circleRadius = body.circleRadius
    this.x = body.position.x
    this.y = body.position.y
    this.vertices = body.vertices.map(({ x, y }) => ({ x, y }))
    this.render = body.render
  }
}
