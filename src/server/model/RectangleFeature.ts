import Matter from 'matter-js'
import PolygonFeature from './PolygonFeature'

export default class RectangleFeature extends PolygonFeature {
  constructor ({ x, y, width, height }: {
    x: number
    y: number
    width: number
    height: number
  }) {
    const body = Matter.Bodies.rectangle(x, y, width, height)
    super({ body })
  }
}
