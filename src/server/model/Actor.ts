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

  dent ({ actor, delta = DEBUG.STEP_TIME_LIMIT }: {
    actor: Actor
    delta?: number
  }): void {
    console.log('force test:', actor.feature.body.force)
    this.health = this.health - delta * 0.25
    if (this.health <= 0) {
      this.destroy()
    } else {
      const alpha = this.health / this.maximumHealth
      this.feature.body.render.fillStyle = `rgba(0, 255, 255, ${alpha})`
    }
  }

  characterCollide ({ actor }: { actor: Actor }): void {}

  characterColliding ({ actor, delta }: { actor: Actor, delta: number }): void {}

  collide ({ actor }: { actor?: Actor }): void {
    if (actor?.feature.body.label === 'character') {
      this.characterCollide({ actor })
    }
  }

  colliding ({ actor, delta }: { actor?: Actor, delta: number }): void {
    if (actor?.feature.body.label === 'character') {
      this.characterColliding({ actor, delta })
    }
  }
}
