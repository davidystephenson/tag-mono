import Matter from 'matter-js'
import Input from '../../shared/Input'
import { DEBUG } from '../lib/debug'
import Actor from './Actor'
import Bot from './Bot'
import CircleFeature from './CircleFeature'
import Direction from './Direction'
import Feature from './Feature'
import { isPointInVisionRange } from '../lib/inRange'
import Stage from './Stage'

export default class Character extends Actor {
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
    this.stage.characterBodies.push(this.feature.body)
    this.stage.characters.set(this.feature.body.id, this)
    if (this.stage.characters.size === 1) setTimeout(() => this.makeIt({ predator: this }), 300)
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
    if (this.stage.it === actor) {
      const it = actor as Character
      if (it.ready && this.ready) {
        this.makeIt({ predator: it })
      }
    }
  }

  destroy (): void {
    super.destroy()
    this.stage.characters.delete(this.feature.body.id)
    if (this.pursuer != null) {
      this.pursuer.setPath({ path: [], label: 'reset' })
    }
  }

  getDirection ({
    end,
    color,
    velocity = { x: 0, y: 0 }
  }: {
    end: Matter.Vector
    color?: string
    velocity?: Matter.Vector
  }): Direction {
    return new Direction({
      color,
      end,
      endVelocity: velocity,
      stage: this.stage,
      start: this.feature.body.position,
      startVelocity: this.feature.body.velocity
    })
  }

  getVisibleFeatures (): Feature[] {
    const visibleFeatures: Feature[] = []
    this.stage.features.forEach(feature => {
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
    return this.stage.raycast.isPointOpen({
      start: this.feature.body.position, end: point, radius: this.radius, obstacles: this.stage.wallBodies, debug
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
    if (this.stage.it === this) {
      throw new Error('Already it')
    }
    predator.loseIt({ prey: this })
    this.loseReady()
    this.setColor('white')
    this.stage.it = this
    this.stage.timeout(5000, this.beReady)
  }

  setColor (color: string): void {
    this.feature.body.render.fillStyle = color
    this.feature.body.render.strokeStyle = color
  }
}
