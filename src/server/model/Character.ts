import Matter from 'matter-js'
import Input from '../../shared/Input'
import Actor from './Actor'
import Bot from './Bot'
import CircleFeature from './CircleFeature'
import Direction from './Direction'
import Feature from './Feature'

export default class Character extends Actor {
  static polygons = ['frame', 'rock']
  static it?: Character
  static characters = new Map<number, Character>()
  static MAXIMUM_RADIUS = 15
  static DEBUG_MAKE_IT = false
  readonly radius: number
  force = 0.0001
  controls = new Input().controls
  taggable = true
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
    super({ feature })
    this.radius = radius
    this.feature.body.label = 'character'
    Character.characters.set(this.feature.body.id, this)
    if (Character.characters.size === 1) this.makeIt()
  }

  act (): void {
    super.act()
    if (this.taggable || this.observer) {
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

  characterCollide ({ actor }: { actor: Actor }): void {
    if (Character.it === actor) {
      const it = actor as Character
      if (it.taggable && this.taggable) {
        this.makeIt()
      }
    }
  }

  destroy (): void {
    super.destroy()
    Character.characters.delete(this.feature.body.id)
    if (this.pursuer != null) {
      this.pursuer.path = []
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

  isFeatureVisible (feature: Feature): boolean {
    const isVisible = feature.isVisible({
      center: this.feature.body.position,
      radius: this.radius,
      obstacles: Feature.obstacles
    })

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
    this.setColor('green')
  }

  makeIt (): void {
    if (Character.DEBUG_MAKE_IT) console.log('makeIt', this.feature.body.id)
    if (Character.it === this) {
      throw new Error('Already it')
    }
    Character.it?.loseIt()
    this.taggable = false
    this.setColor('white')
    Character.it = this
    setTimeout(() => {
      this.taggable = true

      this.setColor('red')
    }, 5000)
  }

  setColor (color: string): void {
    this.feature.body.render.fillStyle = color
    this.feature.body.render.strokeStyle = color
  }
}
