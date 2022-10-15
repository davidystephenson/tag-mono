import Matter from 'matter-js'
import Feature from './Feature'
import Stage from './Stage'
import Actor from './Actor'
import { project } from './math'

export default class Scenery extends Actor {
  static BLUE = 255
  static DENSITY = 0.00003
  static GREEN = 255
  static RED = 0

  health: number
  readonly maximumHealth: number
  constructor ({ feature, stage }: {
    feature: Feature
    stage: Stage
  }) {
    super({ feature, stage })
    const area = this.feature.getArea() / 100
    this.health = area * area * area
    this.maximumHealth = this.health
  }

  collide ({ actor, delta, normal }: {
    actor: Actor
    delta?: number
    normal: Matter.Vector
  }): void {
    super.collide({ actor, delta, normal })
    this.dent({ actor, normal })
  }

  dent ({ actor, normal }: {
    actor: Actor
    normal: Matter.Vector
  }): void {
    const projectionA = project(this.feature.body.velocity, normal)
    const projectionB = project(actor.feature.body.velocity, normal)
    const collideVelocity = Matter.Vector.sub(projectionA, projectionB)
    const collideSpeed = Matter.Vector.magnitude(collideVelocity)
    const massA = this.feature.body.mass
    const massB = actor.feature.body.mass
    const collidePower = collideSpeed * massA * massB
    const impact = collidePower * collidePower * collidePower
    const damage = impact * 10000000
    this.health = this.health - damage
    if (this.health <= 0) {
      this.destroy()
    } else {
      const alpha = this.health / this.maximumHealth
      this.feature.setColor({ alpha })
    }
  }
}
