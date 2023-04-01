import Matter from 'matter-js'
import Feature from './Feature'
import PropActor from './PropActor'
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

  beReady (): void {}

  collide ({ actor, body, delta, normal, scale }: {
    actor?: Actor
    body: Matter.Body
    delta?: number
    normal: Matter.Vector
    scale?: number
  }): void {}

  destroy (): void {
    this.feature.destroy()
    this.stage.actors.delete(this.feature.body.id)
  }

  loseReady ({ propActor, time }: {
    propActor?: PropActor
    time?: number
  }): void {}
}
