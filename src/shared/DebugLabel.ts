
export default class DebugLabel {
  static labels: DebugLabel[] = []
  static debug = false
  readonly x: number
  readonly y: number
  readonly text: string
  readonly color: string

  constructor ({ x, y, text, color = 'white' }: {
    x: number
    y: number
    text: string
    color: string
  }) {
    this.x = x
    this.y = y
    this.text = text
    this.color = color
    DebugLabel.labels.push(this)
  }
}
