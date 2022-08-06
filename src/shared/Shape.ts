import Matter from 'matter-js'
import { vectorToPoint } from '../server/lib/engine'

export default class Shape {
  readonly circleRadius?: number
  readonly socketid?: string
  readonly id: number
  render: Matter.IBodyRenderOptions
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
    const points = body.vertices.map(vectorToPoint)
    this.vertices = points
    this.ivertices = points
    this.render = body.render
  }
}
