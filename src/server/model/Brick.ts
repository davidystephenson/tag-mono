import Matter from 'matter-js'
import Actor from './Actor'
import Crate from './Crate'
import Stage from './Stage'

export default class Brick extends Actor {
  constructor ({
    angle = 0,
    density = Actor.SCENERY_DENSITY,
    height = 10,
    stage,
    width = 10,
    x = 0,
    y = 0
  }: {
    angle?: number
    density?: number
    height: number
    stage: Stage
    width: number
    x: number
    y: number
  }) {
    const brick = new Crate({ angle, density, height, stage, width, x, y })
    super({ feature: brick, stage })
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
