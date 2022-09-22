import Matter from 'matter-js'
import Input from '../../shared/Input'
import { DEBUG } from '../lib/debug'
import Actor from './Actor'
import Bot from './Bot'
import CircleFeature from './CircleFeature'
import Direction from './Direction'
import Feature from './Feature'
import { setEngineTimeout } from '../lib/engine'
import VISION from '../../shared/VISION'
import { isPointInVisionRange } from '../lib/inRange'
import { isPointOpen } from '../lib/raycast'

export default class Character extends Actor {
  static polygons = ['frame', 'rock']
  static it?: Character
  static characters = new Map<number, Character>()
  static bodies: Matter.Body[] = []
  static MAXIMUM_RADIUS = 15
  static MARGIN = Character.MAXIMUM_RADIUS + 1
  static isPointOpen ({ start, end, body, radius, debug }: {
    start: Matter.Vector
    end: Matter.Vector
    body: Matter.Body
    radius: number
    debug?: boolean
  }): boolean {
    const obstacles = Character.bodies.filter(b => b !== body)
    return isPointOpen({ start, end, radius, debug, obstacles })
  }

  readonly radius: number
  force = 0.0001
  controls = new Input().controls
  ready = true
  pursuer?: Bot
  blocked = true // Philosophical
  moving = false
  declare feature: CircleFeature
  observer = false

  constructor ({ x = 0, y = 0, radius = 15, color = 'green' }: {
    x: number
    y: number
    color?: string
    radius?: number
  }) {
    const feature = new CircleFeature({ x, y, radius, color })
    feature.body.label = 'character'
    super({ feature })
    this.radius = radius
    Character.characters.set(this.feature.body.id, this)
    Character.bodies.push(this.feature.body)
    if (Character.characters.size === 1) setTimeout(() => this.makeIt({ predator: this }), 300)
  }

  act (): void {
    super.act()
    if (this.ready || this.observer) {
      const vector = { x: 0, y: 0 }
      this.moving = false
      if (this.controls.up) {
        vector.y += -1
        this.moving = true
      }
      if (this.controls.down) {
        vector.y += 1
        this.moving = true
      }
      if (this.controls.left) {
        vector.x += -1
        this.moving = true
      }
      if (this.controls.right) {
        vector.x += 1
        this.moving = true
      }
      const direction = Matter.Vector.normalise(vector)
      const multiplied = Matter.Vector.mult(direction, this.force)
      Matter.Body.applyForce(this.feature.body, this.feature.body.position, multiplied)
    }
  }

  beReady = (): void => {
    console.log('beReady')
    this.ready = true
    this.setColor('red')
  }

  characterCollide ({ actor }: { actor: Actor }): void {
    if (Character.it === actor) {
      const it = actor as Character
      if (it.ready && this.ready) {
        this.makeIt({ predator: it })
      }
    }
  }

  destroy (): void {
    super.destroy()
    Character.characters.delete(this.feature.body.id)
    if (this.pursuer != null) {
      this.pursuer.setPath({ path: [], label: 'reset' })
    }
  }

  getDirection ({ end, debugColor, velocity = { x: 0, y: 0 } }: { end: Matter.Vector, velocity?: Matter.Vector, debugColor?: string }): Direction {
    return new Direction({
      start: this.feature.body.position,
      end,
      startVelocity: this.feature.body.velocity,
      endVelocity: velocity,
      debugColor
    })
  }

  getVisibleFeatures (): Feature[] {
    const visibleFeatures: Feature[] = []
    Feature.features.forEach(feature => {
      const isVisible = this.isFeatureVisible(feature)
      if (isVisible) visibleFeatures.push(feature)
    })
    return visibleFeatures
  }

  isPointCharacterOpen ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    return Character.isPointOpen({
      start: this.feature.body.position,
      end: point,
      body: this.feature.body,
      radius: this.radius,
      debug
    })
  }

  isFeatureVisible (feature: Feature): boolean {
    const isVisible = feature.isVisible({
      center: this.feature.body.position,
      radius: this.radius
    })

    return isVisible
  }

  isPointInRange (point: Matter.Vector): boolean {
    return isPointInVisionRange({ start: this.feature.body.position, end: point })
  }

  loseIt ({ prey }: { prey: Character }): void {
    this.setColor('green')
  }

  loseReady (): void {
    this.ready = false
    this.setColor('white')
  }

  makeIt ({ predator }: { predator: Character }): void {
    if (DEBUG.MAKE_IT) console.log('makeIt', this.feature.body.id)
    if (Character.it === this) {
      throw new Error('Already it')
    }
    predator.loseIt({ prey: this })
    this.loseReady()
    this.setColor('white')
    Character.it = this
    setEngineTimeout(5000, this.beReady)
  }

  setColor (color: string): void {
    this.feature.body.render.fillStyle = color
    this.feature.body.render.strokeStyle = color
  }
}
