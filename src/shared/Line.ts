import Matter from 'matter-js'
import Stage from '../server/model/Stage'

export default class Line {
  readonly color: string
  readonly end: Matter.Vector
  readonly start: Matter.Vector
  constructor ({ color = 'black', end, stage, start }: {
    color: string
    end: Matter.Vector
    stage: Stage
    start: Matter.Vector
  }) {
    this.start = { x: start.x, y: start.y }
    this.end = { x: end.x, y: end.y }
    this.color = color
    stage.lines.push(this)
  }
}
