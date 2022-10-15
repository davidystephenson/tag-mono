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

  collide ({ actor, body, delta, normal }: {
    actor?: Actor
    body: Matter.Body
    delta?: number
    normal: Matter.Vector
  }): void {
    super.collide({ actor, body, delta, normal })
    this.dent({ body, normal })
  }

  dent ({ body, normal }: {
    body: Matter.Body
    normal: Matter.Vector
  }): void {
    const massA = this.feature.body.mass
    const velocityA = this.feature.body.velocity
    const massB = body.mass < 100 ? body.mass : 100
    const velocityB = body.velocity
    const projectionA = project(velocityA, normal)
    const projectionB = project(velocityB, normal)
    const collideMomentum = Matter.Vector.sub(projectionA, projectionB)
    const collideForce = Matter.Vector.magnitude(collideMomentum)
    const collidePower = collideForce * massB / (massA + massB)
    const impact = collidePower * collidePower * collidePower
    const damage = impact * 20
    this.health = this.health - damage
    if (this.health <= 0) {
      this.destroy()
    } else {
      const alpha = this.health / this.maximumHealth
      this.feature.setColor({ alpha })
    }
  }
}
