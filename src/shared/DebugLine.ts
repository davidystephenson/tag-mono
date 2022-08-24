import Matter from 'matter-js'

export default class DebugLine {
  static lines: DebugLine[] = []
  static IS_CLEAR = false
  static COLLISION = false
  static ALERT_PATH = false
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
