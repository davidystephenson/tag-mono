import Matter from 'matter-js'
import { engine } from '../lib/engine'

export default class Actor {
  static actors = new Map<number, Actor>()
  readonly compound: Matter.Body
  readonly parts: Matter.Body[]

  constructor ({ parts }: {
    parts: Matter.Body[]
  }) {
    this.parts = parts
    this.compound = Matter.Body.create({ parts })
    this.compound.label = 'compound'

    Matter.Composite.add(engine.world, this.compound)
    Actor.actors.set(this.compound.id, this)
    this.parts.forEach(part => Actor.actors.set(part.id, this))
  }

  destroy (): void {
    Matter.Composite.remove(engine.world, this.compound)
    this.parts.forEach(part => Actor.actors.delete(part.id))
    Actor.actors.delete(this.compound.id)
  }
}
