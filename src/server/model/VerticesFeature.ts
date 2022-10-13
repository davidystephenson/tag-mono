import Matter from 'matter-js'
import PolygonFeature from './PolygonFeature'
import Stage from './Stage'

export default class VerticesFeature extends PolygonFeature {
  constructor ({ blue = 128, density = 0.001, green = 128, isObstacle = true, red = 128, stage, vertices, x, y }: {
    blue?: number
    density?: number
    green?: number
    isObstacle?: boolean
    red?: number
    stage: Stage
    vertices: Matter.Vector[]
    x: number
    y: number
  }) {
    const body = Matter.Bodies.fromVertices(x, y, [vertices])
    super({ blue, body, density, green, isObstacle, red, stage })
  }
}
