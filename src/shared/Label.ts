export default class Label {
  readonly color: string
  readonly text: string
  readonly x: number
  readonly y: number
  constructor ({ color = 'white', text, x, y }: {
    color: string
    text: string
    x: number
    y: number
  }) {
    this.x = x
    this.y = y
    this.text = text
    this.color = color
  }
}
