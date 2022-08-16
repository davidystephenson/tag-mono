import Matter from 'matter-js'
import PolygonFeature from './PolygonFeature'

export default class VerticesFeature extends PolygonFeature {
  constructor ({ x, y, vertices, isObstacle = true, density = 0.001 }: {
    x: number
    y: number
    vertices: Matter.Vector[]
    isObstacle?: boolean
    density?: number
  }) {
    const body = Matter.Bodies.fromVertices(x, y, [vertices])
    super({ body, isObstacle, density })
  }
}
