import Matter from 'matter-js'
import Input from '../../shared/Input'
import { DEBUG } from '../lib/debug'
import Actor from './Actor'
import Bot from './Bot'
import CircleFeature from './CircleFeature'
import Direction from './Direction'
import Feature from './Feature'
import { setEngineTimeout } from '../lib/engine'
import { isPointInVisionRange } from '../lib/inRange'
import { isPointOpen } from '../lib/raycast'
import Wall from './Wall'
import Stage from './Stage'

export default class Character extends Actor {
  static polygons = ['frame', 'rock']
  static it?: Character
  static characters = new Map<number, Character>()
  static bodies: Matter.Body[] = []
  static MAXIMUM_RADIUS = 15
  static MARGIN = Character.MAXIMUM_RADIUS + 1

  blocked = true // Philosophical
  controls = new Input().controls
  declare feature: CircleFeature
  force = 0.0001
  moving = false
  observer = false
  pursuer?: Bot
  readonly radius: number
  ready = true
  constructor ({ color = 'green', radius = 15, stage, x = 0, y = 0 }: {
    color?: string
    radius?: number
    stage: Stage
    x: number
    y: number
  }) {
    const feature = new CircleFeature({ x, y, radius, color, stage })
    feature.body.label = 'character'
    super({ feature, stage })
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
    this.checkTag({ actor })
  }

  characterColliding ({ actor }: { actor: Actor }): void {
    this.checkTag({ actor })
  }

  checkTag ({ actor }: { actor: Actor }): void {
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

  getDirection ({ end, debugColor, velocity = { x: 0, y: 0 } }: {
    end: Matter.Vector
    velocity?: Matter.Vector
    debugColor?: string
  }): Direction {
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

  isFeatureVisible (feature: Feature): boolean {
    const isVisible = feature.isVisible({
      center: this.feature.body.position,
      radius: this.radius * 0.9
    })

    return isVisible
  }

  isPointInRange (point: Matter.Vector): boolean {
    return isPointInVisionRange({ start: this.feature.body.position, end: point })
  }

  isPointWallOpen ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    return isPointOpen({
      start: this.feature.body.position, end: point, radius: this.radius, obstacles: Wall.wallObstacles, debug
    })
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
