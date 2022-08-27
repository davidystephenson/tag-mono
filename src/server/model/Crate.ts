import Matter from 'matter-js'
import RectangleFeature from './RectangleFeature'

export default class Crate extends RectangleFeature {
  health = 1
  constructor ({
    x = 0,
    y = 0,
    width = 10,
    height = 10,
    angle = 0,
    color = 'aqua',
    density = 0.00005
  }: {
    x: number
    y: number
    width: number
    height: number
    angle?: number
    color?: string
    density?: number
  }) {
    super({ x, y, width, height, density })
    this.body.render.fillStyle = color
    this.body.label = 'crate'
    Matter.Body.setAngle(this.body, angle)
  }

  dent (): void {
    this.health = this.health - 0.01
    if (this.health <= 0) {
      this.destroy()
    } else {
      this.body.render.fillStyle = `rgba(0, 255, 255, ${this.health})`
    }
  }
}
