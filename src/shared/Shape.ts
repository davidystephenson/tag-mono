import Matter from 'matter-js'
import { vectorToPoint } from './math'

export default class Shape {
  alpha: number
  blue: number
  circleRadius?: number
  deleted = false
  green: number
  readonly id: number
  ivertices: Matter.Vector[]
  ix: number
  iy: number
  red: number
  render: Matter.IBodyRenderOptions
  readonly socketid?: string
  vertices: Matter.Vector[]
  x: number
  y: number
  constructor ({ alpha, blue, body, green, red }: {
    alpha: number
    blue: number
    body: Matter.Body
    green: number
    red: number
  }) {
    this.alpha = alpha
    this.blue = blue
    this.circleRadius = body.circleRadius
    this.green = green
    this.red = red
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
