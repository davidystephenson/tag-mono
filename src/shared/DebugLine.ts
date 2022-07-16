import Matter from 'matter-js'

export default class DebugLine {
  static lines: DebugLine[] = []
  static raycast = false
  readonly start: Matter.Vector
  readonly end: Matter.Vector
  readonly color: string

  constructor ({ start, end, color = 'black' }: {
    start: Matter.Vector
    end: Matter.Vector
    color: string
  }) {
    this.start = start
    this.end = end
    this.color = color
    DebugLine.lines.push(this)
  }
}
