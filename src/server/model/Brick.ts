import Matter from 'matter-js'
import { getRandomRectangleSize } from '../lib/math'
import Actor from './Actor'
import Crate from './Crate'

export default class Brick extends Actor {
  static random ({ x, y, width, height, minimumWidth = 1, minimumHeight = 1 }: {
    x: number
    y: number
    width: number
    height: number
    minimumWidth?: number
    minimumHeight?: number
  }): Brick {
    const rectangle = getRandomRectangleSize({
      minimumWidth: minimumWidth, maximumWidth: width, minimumHeight: minimumHeight, maximumHeight: height
    })

    return new Brick({
      x, y, width: rectangle.width, height: rectangle.height
    })
  }

  constructor ({
    angle = 0,
    color = Actor.SCENERY_COLOR,
    density = Actor.SCENERY_DENSITY,
    height = 10,
    width = 10,
    x = 0,
    y = 0
  }: {
    angle?: number
    color?: string
    density?: number
    height: number
    width: number
    x: number
    y: number
  }) {
    const brick = new Crate({ angle, color, density, height, width, x, y })
    super({ feature: brick })
  }

  characterCollide ({ actor, delta, normal }: {
    actor: Actor
    delta?: number
    normal: Matter.Vector
  }): void {
    super.characterCollide({ actor, delta, normal })
    this.dent({ actor, delta, normal })
  }
}
