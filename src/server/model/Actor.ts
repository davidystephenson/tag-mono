import Matter from 'matter-js'
import { engine } from '../lib/engine'

export default class Actor {
  readonly compound: Matter.Body
  readonly parts: Matter.Body[]

  constructor ({ parts }: {
    parts: Matter.Body[]
  }) {
    this.parts = parts
    this.compound = Matter.Body.create({ parts })
    Matter.Composite.add(engine.world, this.compound)
  }
}
