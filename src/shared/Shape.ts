import Matter from 'matter-js'
import { vectorToPoint } from './math'

export default class Shape {
  readonly circleRadius?: number
  deleted = false
  readonly id: number
  ivertices: Matter.Vector[]
  ix: number
  iy: number
  render: Matter.IBodyRenderOptions
  readonly socketid?: string
  vertices: Matter.Vector[]
  x: number
  y: number
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
