import Feature from './Feature'

export default class Actor {
  static paused = false
  static actors = new Map<number, Actor>()
  readonly feature: Feature
  health = 1

  constructor ({ feature }: {
    feature: Feature
  }) {
    this.feature = feature
    this.feature.actor = this
    Actor.actors.set(this.feature.body.id, this)
  }

  act (): void {}

  destroy (): void {
    this.feature.destroy()
    Actor.actors.delete(this.feature.body.id)
  }

  dent (): void {
    this.health = this.health - 0.0001
    if (this.health <= 0) {
      this.destroy()
    } else {
      this.feature.body.render.fillStyle = `rgba(0, 255, 255, ${this.health})`
    }
  }

  characterCollide ({ actor }: { actor: Actor }): void {}

  collide ({ actor }: { actor?: Actor }): void {
    if (actor?.feature.body.label === 'character') {
      this.characterCollide({ actor })
    }
  }
}
