import Matter from 'matter-js'
import PolygonFeature from './PolygonFeature'
import Stage from './Stage'

export default class VerticesFeature extends PolygonFeature {
  constructor ({ color = 'gray', density = 0.001, isObstacle = true, stage, vertices, x, y }: {
    color?: string
    density?: number
    isObstacle?: boolean
    stage: Stage
    vertices: Matter.Vector[]
    x: number
    y: number
  }) {
    const body = Matter.Bodies.fromVertices(x, y, [vertices])
    super({ body, color, density, isObstacle, stage })
  }
}
