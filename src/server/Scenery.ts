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
    const area = this.feature.getArea()
    // const minimum = Math.min(area, 10000)
    this.health = area
    console.log('this.health test:', this.health)
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
      // console.log('collidePower test:', collidePower)
      const impact = Math.max(collidePower, 0.01)
      // console.log('impact test:', impact)
      const damage = impact * 50 * scale
      this.health = this.health - damage
      if (this.health <= 0) {
        const actorIsIt = this.stage.it === actor
        if (actorIsIt) {
          if (this.stage.scenerySpawn) {
            void new Bot({ stage: this.stage, x: this.feature.body.position.x, y: this.feature.body.position.y })
          }
        } else if (actor?.feature.body.label === 'character') {
          const area = this.feature.getArea()
          const log = Math.log2(area)
          const shrink = log * 0.001
          const groundedShrink = Math.max(0.001, shrink)
          const scale = 1 - groundedShrink
          const floored = Math.max(scale, 0.5)
          console.log('floored', floored)
          Matter.Body.scale(actor.feature.body, floored, floored)
          actor.feature.setColor({ blue: 255, green: 255, red: 0 })
          const delay = (1 - floored) * 10000
          setTimeout(actor.beReady, delay)
        }
        this.destroy()
      } else {
        const alpha = this.health / this.maximumHealth
        this.feature.setColor({ alpha })
      }
    }
  }
}
