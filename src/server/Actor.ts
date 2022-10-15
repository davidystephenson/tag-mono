import Matter from 'matter-js'
import Feature from './Feature'
import Stage from './Stage'

export default class Actor {
  readonly feature: Feature
  readonly stage: Stage
  constructor ({ feature, stage }: {
    feature: Feature
    stage: Stage
  }) {
    this.feature = feature
    this.stage = stage
    this.feature.actor = this
    this.stage.actors.set(this.feature.body.id, this)
  }

  act (): void {}

  collide ({ actor, body, delta, normal }: {
    actor?: Actor
    body: Matter.Body
    delta?: number
    normal: Matter.Vector
  }): void {}

  destroy (): void {
    this.feature.destroy()
    this.stage.actors.delete(this.feature.body.id)
  }
}
