import Matter from 'matter-js'
import Feature from './Feature'
import Stage from './Stage'
import Actor from './Actor'
import { project } from './math'
import Character from './Character'

export default class PropActor extends Actor {
  static BLUE = 255
  static DENSITY = 0.00003
  static GREEN = 255
  static RED = 0
  static COLOR = { blue: PropActor.BLUE, green: PropActor.GREEN, red: PropActor.RED }
  static LIMIT_COLOR = { blue: 0, green: 0, red: 0 }

  health: number
  readonly maximumHealth: number
  spawning = true
  spawnBodies = new Array<Matter.Body>()
  constructor ({ feature, stage }: {
    feature: Feature
    stage: Stage
  }) {
    super({ feature, stage })
    const area = this.feature.getArea()
    this.health = area
    this.maximumHealth = this.health
    setTimeout(() => {
      this.spawning = false
    }, 5000)
    this.spawnBodies = this
      .stage
      .bodies
      // @ts-expect-error
      .filter(body => body.id !== this.feature.body.id && Matter.Collision.collides(this.feature.body, body))
  }

  act (): void {
    super.act()
    // @ts-expect-error
    this.spawnBodies = this.spawnBodies.filter(body => Matter.Collision.collides(this.feature.body, body))
    this.spawnBodies.forEach(() => {
      const damage = this.maximumHealth / 1000
      this.takeDamage({ damage })
    })
  }

  getScale ({ label }: { label: string}): number {
    switch (label) {
      case 'wall':
        return 0.01
      case 'character':
        return 100
      default:
        return 1
    }
  }

  collide ({ actor, body, delta, normal }: {
    actor?: Actor
    body: Matter.Body
    delta?: number
    normal: Matter.Vector
    scale?: number
  }): void {
    super.collide({ actor, body, delta, normal })
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
      const scale = this.getScale({ label: body.label })
      const impact = collidePower * scale
      const damage = Math.max(impact, 0.01)
      this.takeDamage({ damage, actor })
    }
  }

  takeDamage ({ damage, actor }: {
    damage: number
    actor?: Actor
  }): void {
    this.health = this.health - damage
    if (this.health <= 0) {
      if (actor?.isIt() === true) {
        if (this.stage.spawnOnDestroy) {
          this.stage.spawnSafestBrick()
        }
      } else if (actor?.feature.body.label === 'character') {
        const area = this.feature.getArea()
        const root = Math.sqrt(area)
        const shrink = root * 0.001
        const groundedShrink = Math.max(0.001, shrink)
        const scale = 1 - groundedShrink
        const floored = Math.max(scale, 0.5)
        Matter.Body.scale(actor.feature.body, floored, floored)
        const radius = actor.feature.getRadius()
        if (radius < 10) {
          const needed = 10 / radius
          actor.feature.setColor(PropActor.COLOR)
          Matter.Body.scale(actor.feature.body, needed, needed)
        } else {
          const character = actor as Character
          character.setRadiusColor()
        }
      }
      this.destroy()
    } else {
      const alpha = this.health / this.maximumHealth
      this.feature.setColor({ alpha })
    }
  }
}
