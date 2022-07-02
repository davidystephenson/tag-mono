import Matter from 'matter-js'
import { Shape } from '../../types'

export function shapeFactory (body: Matter.Body): Shape {
  const shape = {
    vertices: body.vertices.map(({ x, y }) => ({ x, y })),
    render: body.render
  }
  return shape
}
