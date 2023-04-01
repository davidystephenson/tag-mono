import RectangleFeature from './RectangleFeature'
import PropActor from './PropActor'
import Stage from './Stage'

export default class Brick extends PropActor {
  constructor ({
    angle = 0,
    blue = PropActor.BLUE,
    density = PropActor.DENSITY,
    green = PropActor.GREEN,
    height = 10,
    red = PropActor.RED,
    stage,
    width = 10,
    x = 0,
    y = 0
  }: {
    angle?: number
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
    const feature = new RectangleFeature({
      blue, density, green, height, red, stage, width, x, y
    })
    feature.body.label = 'brick'
    super({ feature, stage })
  }
}
