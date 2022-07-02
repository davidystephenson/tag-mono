import Matter from 'matter-js'
import { engine } from '../engine'

export const compounds: Matter.Body[] = []

export interface Actor {
  compound: Matter.Body
  parts: Matter.Body[]
}

export function actorFactory ({ parts = [] }: {
  parts: Matter.Body[]
}): Actor {
  const compound = Matter.Body.create({ parts })
  Matter.Composite.add(engine.world, compound)
  compounds.push(compound)
  const actor = { compound, parts }
  return actor
}
