import Matter from 'matter-js'
import PolygonFeature from './PolygonFeature'
import Stage from './Stage'

export default class RectangleFeature extends PolygonFeature {
  readonly height: number
  readonly width: number
  constructor ({ blue = 128, density = 0.001, green = 128, height, red = 128, stage, width, x, y }: {
    blue?: number
    density?: number
    green?: number
    height: number
    red?: number
    stage: Stage
    width: number
    x: number
    y: number
  }) {
    const body = Matter.Bodies.rectangle(x, y, width, height)
    super({ blue, body, density, green, red, stage })
    this.width = width
    this.height = height
  }

  getArea (): number {
    return this.width * this.height
  }
}
