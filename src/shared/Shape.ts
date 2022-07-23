import Matter from 'matter-js'

export default class Shape {
  readonly circleRadius?: number
  readonly socketid?: string
  readonly id: number
  readonly render: Matter.IBodyRenderOptions
  x: number
  y: number
  ix: number
  iy: number
  vertices: Matter.Vector[]
  ivertices: Matter.Vector[]
  deleted = false

  constructor (body: Matter.Body) {
    this.circleRadius = body.circleRadius
    this.x = body.position.x
    this.y = body.position.y
    this.ix = body.position.x
    this.iy = body.position.y
    this.id = body.id
    this.vertices = body.vertices.map(({ x, y }) => ({ x, y }))
    this.ivertices = body.vertices.map(({ x, y }) => ({ x, y }))
    this.render = body.render
  }
}
