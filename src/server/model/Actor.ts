import Matter from 'matter-js'
import { DEBUG } from '../lib/debug'
import Feature from './Feature'

export default class Actor {
  static SCENERY_DENSITY = 0.00003
  static SCENERY_COLOR = 'rgba(0, 255, 255, 1)'
  static paused = false
  static actors = new Map<number, Actor>()
  readonly feature: Feature
  maximumHealth: number
  health: number

  constructor ({ feature }: {
    feature: Feature
  }) {
    this.feature = feature
    this.feature.actor = this
    this.health = this.feature.getArea()
    this.maximumHealth = this.health
    Actor.actors.set(this.feature.body.id, this)
  }

  act (): void {}

  destroy (): void {
    this.feature.destroy()
    Actor.actors.delete(this.feature.body.id)
  }

  project (a: Matter.Vector, b: Matter.Vector): Matter.Vector {
    const dotBB = Matter.Vector.dot(b, b)
    if (dotBB === 0) return { x: 0, y: 0 }
    const dotAB = Matter.Vector.dot(a, b)
    const scale = dotAB / dotBB
    return Matter.Vector.mult(b, scale)
  }

  dent ({ actor, delta = DEBUG.STEP_TIME_LIMIT, normal }: {
    actor: Actor
    delta?: number
    normal: Matter.Vector
  }): void {
    const projectionA = this.project(this.feature.body.velocity, normal)
    const projectionB = this.project(actor.feature.body.velocity, normal)
    const collideVelocity = Matter.Vector.sub(projectionA, projectionB)
    const collideSpeed = Matter.Vector.magnitude(collideVelocity)
    const massA = this.feature.body.mass
    const massB = actor.feature.body.mass
    const collidePower = collideSpeed * massA * massB
    const damage = delta * collidePower * 100
    this.health = this.health - damage
    if (this.health <= 0) {
      this.destroy()
    } else {
      const alpha = this.health / this.maximumHealth
      this.feature.body.render.fillStyle = `rgba(0, 255, 255, ${alpha})`
    }
  }

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
}
