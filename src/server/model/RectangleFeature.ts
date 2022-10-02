import Matter from 'matter-js'
import PolygonFeature from './PolygonFeature'
import Stage from './Stage'

export default class RectangleFeature extends PolygonFeature {
  readonly height: number
  readonly width: number
  constructor ({ color = 'gray', density = 0.001, height, stage, width, x, y }: {
    color?: string
    density?: number
    height: number
    stage: Stage
    width: number
    x: number
    y: number
  }) {
    const body = Matter.Bodies.rectangle(x, y, width, height)
    super({ body, density, color, stage })
    this.width = width
    this.height = height
  }

  getArea (): number {
    return this.width * this.height
  }
}
