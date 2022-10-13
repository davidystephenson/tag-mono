import Crate from './Crate'
import Scenery from './Scenery'
import Stage from './Stage'

export default class Brick extends Scenery {
  constructor ({
    angle = 0,
    blue = Scenery.BLUE,
    density = Scenery.DENSITY,
    green = Scenery.GREEN,
    height = 10,
    red = Scenery.RED,
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
    const brick = new Crate({ angle, blue, density, green, height, red, stage, width, x, y })
    super({ feature: brick, stage })
  }
}
