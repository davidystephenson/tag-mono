import Matter from 'matter-js'
import PolygonFeature from './PolygonFeature'

export default class RectangleFeature extends PolygonFeature {
  constructor ({ x, y, width, height, density = 0.001, color = 'gray' }: {
    x: number
    y: number
    width: number
    height: number
    density?: number
    color?: string
  }) {
    const body = Matter.Bodies.rectangle(x, y, width, height)
    super({ body, density, color })
  }
}
