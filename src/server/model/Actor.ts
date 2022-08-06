import Feature from './Feature'

export default class Actor {
  static paused = false
  static actors = new Map<number, Actor>()
  readonly feature: Feature

  constructor ({ feature }: {
    feature: Feature
  }) {
    this.feature = feature
    Actor.actors.set(this.feature.body.id, this)
  }

  act (): void {}

  destroy (): void {
    this.feature.destroy()
    Actor.actors.delete(this.feature.body.id)
  }
}
