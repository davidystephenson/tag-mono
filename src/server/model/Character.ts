import Matter from 'matter-js'
import Input from '../../shared/Input'
import Actor from './Actor'
import CircleFeature from './CircleFeature'
import Direction from './Direction'
import Feature from './Feature'

export default class Character extends Actor {
  static polygons = ['frame', 'rock']
  static it?: Character
  static characters = new Map<number, Character>()
  static DEBUG_MAKE_IT = false
  readonly radius: number
  force = 0.0001
  controls = new Input().controls
  controllable = true

  constructor ({ x = 0, y = 0, radius = 15, color = 'green' }: {
    x: number
    y: number
    color?: string
    radius?: number
  }) {
    const feature = new CircleFeature({ x, y, radius })
    super({ feature })
    this.radius = radius
    this.feature.body.render.fillStyle = color
    this.feature.body.label = 'character'
    Character.characters.set(this.feature.body.id, this)
    if (Character.characters.size === 1) this.makeIt()
  }

  act (): void {
    super.act()
    if (this.controllable) {
      const vector = { x: 0, y: 0 }
      if (this.controls.up) vector.y += -1
      if (this.controls.down) vector.y += 1
      if (this.controls.left) vector.x += -1
      if (this.controls.right) vector.x += 1
      const direction = Matter.Vector.normalise(vector)
      const multiplied = Matter.Vector.mult(direction, this.force)
      Matter.Body.applyForce(this.feature.body, this.feature.body.position, multiplied)
    }
  }

  getDirection ({ end, debugColor, velocity = { x: 0, y: 0 } }: { end: Matter.Vector, velocity?: Matter.Vector, debugColor?: string }): Direction {
    return new Direction({
      start: this.feature.body.position,
      end,
      startVelocity: this.feature.body.velocity,
      debugColor
    })
  }

  getSides (point: Matter.Vector): Matter.Vector[] {
    const arrow = Matter.Vector.sub(point, this.feature.body.position)
    const direction = Matter.Vector.normalise(arrow)
    const perp = Matter.Vector.perp(direction)
    const startPerp = Matter.Vector.mult(perp, this.radius)
    const leftSide = Matter.Vector.add(this.feature.body.position, startPerp)
    const rightSide = Matter.Vector.sub(this.feature.body.position, startPerp)
    return [leftSide, rightSide]
  }

  isFeatureVisible (feature: Feature): boolean {
    const sides = this.getSides(feature.body.position)
    const viewpoints = [this.feature.body.position, ...sides]
    const isVisible = feature.isVisible({ center: this.feature.body.position, viewpoints, obstacles: Feature.obstacles })

    return isVisible
  }

  getVisibleFeatures (): Feature[] {
    const visibleFeatures: Feature[] = []
    Feature.features.forEach(feature => {
      const isVisible = this.isFeatureVisible(feature)
      if (isVisible) visibleFeatures.push(feature)
    })
    return visibleFeatures
  }

  loseIt (): void {
    this.feature.body.render.fillStyle = 'green'
  }

  makeIt (): void {
    if (Character.DEBUG_MAKE_IT) console.log('makeIt', this.feature.body.id)
    if (Character.it === this) {
      throw new Error('Already it')
    }
    if (Character.it != null) Character.it.loseIt()
    Character.it = this
    this.controllable = false
    this.feature.body.render.fillStyle = 'white'
    setTimeout(() => {
      this.controllable = true

      this.feature.body.render.fillStyle = 'red'
    }, 5000)
  }
}
