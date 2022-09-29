import Matter from 'matter-js'
import { DEBUG } from '../lib/debug'
import { project } from '../lib/math'
import Feature from './Feature'

export default class Actor {
  static actors = new Map<number, Actor>()
  static paused = false
  static SCENERY_DENSITY = 0.00003
  static SCENERY_COLOR = 'rgba(0, 255, 255, 1)'

  health: number
  readonly feature: Feature
  readonly maximumHealth: number
  constructor ({ feature }: {
    feature: Feature
  }) {
    this.feature = feature
    this.feature.actor = this
    const area = this.feature.getArea() / 100
    this.health = area * area * area
    this.maximumHealth = this.health
    Actor.actors.set(this.feature.body.id, this)
  }

  act (): void {}

  characterCollide ({ actor, delta, normal }: {
    actor: Actor
    delta?: number
    normal: Matter.Vector
  }): void {}

  collide ({ actor, delta, normal }: {
    actor: Actor
    delta?: number
    normal: Matter.Vector
  }): void {
    if (actor?.feature.body.label === 'character') {
      this.characterCollide({ actor, delta, normal })
    }
  }

  destroy (): void {
    this.feature.destroy()
    Actor.actors.delete(this.feature.body.id)
  }

  dent ({ actor, delta = DEBUG.STEP_TIME_LIMIT, normal }: {
    actor: Actor
    delta?: number
    normal: Matter.Vector
  }): void {
    const projectionA = project(this.feature.body.velocity, normal)
    const projectionB = project(actor.feature.body.velocity, normal)
    const collideVelocity = Matter.Vector.sub(projectionA, projectionB)
    const collideSpeed = Matter.Vector.magnitude(collideVelocity)
    const massA = this.feature.body.mass
    const massB = actor.feature.body.mass
    const collidePower = collideSpeed * massA * massB
    const impact = collidePower * collidePower
    const damage = delta * impact * 1000
    this.health = this.health - damage
    if (this.health <= 0) {
      this.destroy()
    } else {
      const alpha = this.health / this.maximumHealth
      this.feature.body.render.fillStyle = `rgba(0, 255, 255, ${alpha})`
    }
  }
}
