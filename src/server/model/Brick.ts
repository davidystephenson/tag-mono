import Actor from './Actor'
import Crate from './Crate'

export default class Brick extends Actor {
  constructor ({
    angle = 0,
    color = 'aqua',
    density = 0.00005,
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

  characterCollide ({ actor }: { actor: Actor }): void {
    super.characterCollide({ actor })
    this.dent()
  }
}
