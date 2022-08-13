import Matter from 'matter-js'
import Input from '../../shared/Input'
import { engine } from '../lib/engine'
import Actor from './Actor'
import CircleFeature from './CircleFeature'
import Feature from './Feature'

export default class Character extends Actor {
  static polygons = ['frame', 'rock']
  static it?: Character
  static characters = new Map<number, Character>()
  readonly radius: number
  controls = new Input().controls

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
    const vector = { x: 0, y: 0 }
    if (this.controls.up) vector.y += -1
    if (this.controls.down) vector.y += 1
    if (this.controls.left) vector.x += -1
    if (this.controls.right) vector.x += 1
    const direction = Matter.Vector.normalise(vector)
    const force = Matter.Vector.mult(direction, 0.00005)
    Matter.Body.applyForce(this.feature.body, this.feature.body.position, force)
  }

  getVisibleFeatures (): Feature[] {
    const obstacles = Array.from(Feature.obstacles.values())
    const visibleFeatures: Feature[] = []
    Feature.features.forEach(feature => {
      const arrow = Matter.Vector.sub(feature.body.position, this.feature.body.position)
      const direction = Matter.Vector.normalise(arrow)
      const perp = Matter.Vector.perp(direction)
      const startPerp = Matter.Vector.mult(perp, this.radius)
      const leftSide = Matter.Vector.add(this.feature.body.position, startPerp)
      const rightSide = Matter.Vector.sub(this.feature.body.position, startPerp)
      const viewpoints = [this.feature.body.position, leftSide, rightSide]
      const isVisible = feature.isVisible({ center: this.feature.body.position, viewpoints, obstacles })
      if (isVisible) visibleFeatures.push(feature)
    })
    return visibleFeatures
  }

  makeIt (): void {
    console.log('How many bodies?', Matter.Composite.allBodies(engine.world).length)
    console.log('makeIt', this.feature.body.id)
    this.feature.body.render.fillStyle = 'red'
    if (Character.it != null) Character.it.feature.body.render.fillStyle = 'green'
    Character.it = this
  }
}
