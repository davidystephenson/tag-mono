import Matter from 'matter-js'
import { engine } from '../lib/engine'

export default class Feature {
  static features = new Map<number, Feature>()
  readonly compound: Matter.Body
  readonly parts: Matter.Body[]

  constructor ({ parts }: {
    parts: Matter.Body[]
  }) {
    this.parts = parts
    this.compound = Matter.Body.create({ parts })
    this.compound.label = 'compound'

    Matter.Composite.add(engine.world, this.compound)
    Feature.features.set(this.compound.id, this)
    this.parts.forEach(part => Feature.features.set(part.id, this))
  }

  destroy (): void {
    Matter.Composite.remove(engine.world, this.compound)
    this.parts.forEach(part => Feature.features.delete(part.id))
    Feature.features.delete(this.compound.id)
  }
}
