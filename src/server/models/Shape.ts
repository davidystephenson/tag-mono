import Matter from 'matter-js'
import { Shape } from '../../types'

export function shapeFactory (body: Matter.Body): Shape {
  const shape = {
    circleRadius: body.circleRadius,
    x: body.position.x,
    y: body.position.y,
    vertices: body.vertices.map(({ x, y }) => ({ x, y })),
    render: body.render
  }
  return shape
}
