import Matter from 'matter-js'

export default class Line {
  readonly color: string
  readonly end: Matter.Vector
  readonly start: Matter.Vector
  constructor ({ color = 'black', end, start }: {
    color: string
    end: Matter.Vector
    start: Matter.Vector
  }) {
    this.start = { x: start.x, y: start.y }
    this.end = { x: end.x, y: end.y }
    this.color = color
  }
}
