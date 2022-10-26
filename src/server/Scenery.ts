import Matter from 'matter-js'
import Feature from './Feature'
import Stage from './Stage'
import Actor from './Actor'
import { project } from './math'
import Bot from './Bot'

export default class Scenery extends Actor {
  static BLUE = 255
  static DENSITY = 0.00003
  static GREEN = 255
  static RED = 0

  health: number
  readonly maximumHealth: number
  spawning = true
  constructor ({ feature, stage }: {
    feature: Feature
    stage: Stage
  }) {
    super({ feature, stage })
    this.health = this.feature.getArea()
    this.maximumHealth = this.health
    setTimeout(() => {
      this.spawning = false
    }, 5000)
  }

  collide ({ actor, body, delta, normal, scale = 1 }: {
    actor?: Actor
    body: Matter.Body
    delta?: number
    normal: Matter.Vector
    scale?: number
  }): void {
    super.collide({ actor, body, delta, normal, scale })
    if (!this.spawning) {
      const massA = this.feature.body.mass
      const velocityA = this.feature.body.velocity
      const massB = body.mass < 100 ? body.mass : 100
      const velocityB = body.velocity
      const projectionA = project(velocityA, normal)
      const projectionB = project(velocityB, normal)
      const collideMomentum = Matter.Vector.sub(projectionA, projectionB)
      const collideForce = Matter.Vector.magnitude(collideMomentum)
      const collidePower = collideForce * massB / (massA + massB)
      const damage = collidePower * 50 * scale
      this.health = this.health - damage
      if (this.health <= 0) {
        console.log('die test')
        if (this.stage.it === actor) {
          void new Bot({ stage: this.stage, x: this.feature.body.position.x, y: this.feature.body.position.y })
        } else if (actor?.feature.body.label === 'character') {
          const area = this.feature.getArea()
          const log = Math.log10(area)
          console.log('log test:', log)
          const shrink = log * 0.01
          const groundedShrink = Math.max(0.001, shrink)
          const scale = 1 - groundedShrink
          const floored = Math.max(scale, 0.9)
          console.log('floored test:', floored)
          Matter.Body.scale(actor.feature.body, floored, floored)
          console.log('radius test:', actor.feature.getRadius())
        }
        this.destroy()
      } else {
        const alpha = this.health / this.maximumHealth
        this.feature.setColor({ alpha })
      }
    }
  }
}
