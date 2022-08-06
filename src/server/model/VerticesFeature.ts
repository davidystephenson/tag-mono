import Matter from 'matter-js'
import PolygonFeature from './PolygonFeature'

export default class VerticesFeature extends PolygonFeature {
  constructor ({ x, y, vertices, isObstacle = true }: {
    x: number
    y: number
    vertices: Matter.Vector[]
    isObstacle?: boolean
  }) {
    const body = Matter.Bodies.fromVertices(x, y, [vertices])
    super({ body, isObstacle })
  }
}
