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

  static fromCompounds (compounds: Matter.Body[]): Record<string, Shape> {
    const shapes = compounds.reduce<Record<string, Shape>>((shapes, compound) => {
      compound.parts.slice(1).forEach((part) => {
        shapes[part.id] = new Shape(part)
      })

      return shapes
    }, {})

    return shapes
  }
}
