import Matter from 'matter-js'
import { actorFactory, Actor } from './Actor'

export interface Fighter extends Actor {
  torso: Matter.Body
}

export function fighterFactory ({ x = 0, y = 0, angle = 0, color = 'Orange' }: {
  x: number
  y: number
  angle?: number
  color?: string
}): Fighter {
  const torso = Matter.Bodies.circle(x, y, 15)
  torso.render.fillStyle = color
  const actor = actorFactory({ parts: [torso] })
  Matter.Body.setAngle(actor.compound, angle)
  actor.compound.restitution = 0
  actor.compound.friction = 0
  actor.compound.frictionAir = 0.01
  Matter.Body.setCentre(actor.compound, { x, y }, false)
  Matter.Body.setInertia(actor.compound, 2 * actor.compound.inertia)
  const fighter = { ...actor, torso }
  return fighter
}
