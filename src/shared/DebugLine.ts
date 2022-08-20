import Matter from 'matter-js'

export default class DebugLine {
  static lines: DebugLine[] = []
  static raycast = false
  static collision = false
  static alertPath = true
  readonly start: Matter.Vector
  readonly end: Matter.Vector
  readonly color: string

  constructor ({ start, end, color = 'black' }: {
    start: Matter.Vector
    end: Matter.Vector
    color: string
  }) {
    this.start = { x: start.x, y: start.y }
    this.end = { x: end.x, y: end.y }
    this.color = color
    DebugLine.lines.push(this)
  }
}
