import Matter from 'matter-js'

export const compounds: Matter.Body[] = []

export interface Actor {
  compound: Matter.Body
  parts: Matter.Body[]
}

export function actorFactory ({ parts = [] }: {
  parts: Matter.Body[]
}): Actor {
  const compound = Matter.Body.create({ parts })
  compounds.push(compound)
  const actor = { compound, parts }
  return actor
}
