export default class DebugCircle {
  static circles: DebugCircle[] = []
  static botPosition = false
  readonly x: number
  readonly y: number
  readonly radius: number
  readonly color: string

  constructor ({ x, y, radius, color = 'black' }: {
    x: number
    y: number
    radius: number
    color: string
  }) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    DebugCircle.circles.push(this)
  }
}
