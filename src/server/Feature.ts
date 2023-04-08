import Matter from 'matter-js'
import Actor from './Actor'
import Stage from './Stage'

export default class Feature {
  actor?: Actor
  alpha = 1
  readonly body: Matter.Body
  blue: number
  green: number
  otherSceneryBodies?: Matter.Body[]
  red: number
  readonly scenery: boolean
  readonly stage: Stage
  constructor ({
    body,
    blue = 128,
    density = 0.001,
    green = 128,
    scenery = true,
    red = 128,
    stage
  }: {
    body: Matter.Body
    blue?: number
    density?: number
    green?: number
    scenery?: boolean
    red?: number
    stage: Stage
  }) {
    this.body = body
    this.blue = blue
    this.green = green
    this.red = red
    this.stage = stage
    const color = `rgb(${this.red}, ${this.green}, ${this.blue})`
    this.body.render.fillStyle = color
    this.body.render.strokeStyle = color
    this.scenery = scenery
    Matter.Composite.add(this.stage.engine.world, this.body)
    this.body.restitution = 0
    this.body.friction = 0
    this.body.frictionAir = 0.01
    Matter.Body.setDensity(this.body, density)
    this.stage.features.set(this.body.id, this)
    this.stage.bodies.push(this.body)
    if (this.scenery) {
      this.stage.sceneryFeatures.forEach(feature => {
        feature.otherSceneryBodies?.push(this.body)
      })
      this.otherSceneryBodies = [...this.stage.sceneryBodies]
      this.stage.sceneryFeatures.push(this)
      this.stage.sceneryBodies.push(this.body)
    }
  }

  getArea (): number {
    return Matter.Vertices.area(this.body.vertices, true)
  }

  isInRange ({ point }: {
    point: Matter.Vector
  }): boolean {
    return true
  }

  isVisible ({ center, debug, radius }: {
    center: Matter.Vector
    debug?: boolean
    radius: number
  }): boolean {
    return true
  }

  setColor ({ alpha, blue, green, red }: {
    alpha?: number
    blue?: number
    green?: number
    red?: number
  }): void {
    if (alpha != null) this.alpha = alpha
    if (blue != null) this.blue = blue
    if (green != null) this.green = green
    if (red != null) this.red = red
    const stroke = `rgba(${this.red}, ${this.green}, ${this.blue})`
    this.body.render.strokeStyle = stroke
    const fill = `rgba(${this.red}, ${this.green}, ${this.blue}, ${this.alpha})`
    this.body.render.fillStyle = fill
  }

  destroy (): void {
    Matter.Composite.remove(this.stage.engine.world, this.body)
    this.stage.features.delete(this.body.id)
    if (this.scenery) {
      this.stage.sceneryBodies = this.stage.sceneryBodies.filter(body => body.id !== this.body.id)
      this.stage.sceneryFeatures.forEach(feature => {
        feature.otherSceneryBodies = feature.otherSceneryBodies?.filter(body => body.id !== this.body.id)
      })
    }
  }

  getRadius (): number {
    throw new Error('Only circles have a radius')
  }
}
