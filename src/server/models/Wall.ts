import Matter from 'matter-js'
import { Actor, actorFactory } from './Actor'

export interface Wall extends Actor {
  width: number
  height: number
}

export function wallFactory ({ x = 0, y = 0, width = 100, height = 100 }: {
  x: number
  y: number
  width: number
  height: number
}): Wall {
  console.log('width:', width)
  console.log('height:', height)
  const body = Matter.Bodies.rectangle(x, y, width, height)
  body.render.fillStyle = 'Purple'
  console.log('body.cirleRadius:', body.circleRadius)
  const actor = actorFactory({ parts: [body] })
  Matter.Body.setStatic(actor.compound, true)
  const wall = { ...actor, width, height }
  return wall
}
