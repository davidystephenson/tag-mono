import Stage from '../server/model/Stage'

export default class Circle {
  readonly color: string
  readonly radius: number
  readonly x: number
  readonly y: number
  constructor ({ color = 'black', radius, stage, x, y }: {
    color: string
    radius: number
    stage: Stage
    x: number
    y: number
  }) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
    stage.circles.push(this)
  }
}
