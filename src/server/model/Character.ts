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
  controllable = true
  pursuer?: Bot
  blocked = true // Philosophical
  moving = false
  declare feature: CircleFeature

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
    if (this.controllable) {
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
      if (it.controllable && this.controllable) {
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

    // const struggling = this.moving && this.blocked
    // if (struggling || Character.it == null) {
    //   void new Brick({ x: this.feature.body.position.x, y: this.feature.body.position.y, height: this.radius * 2, width: this.radius * 2 })
    // } else {
    //   const radians = getRadians({ from: this.feature.body.position, to: Character.it.feature.body.position }) - Math.PI / 2
    //   const unitVector = {
    //     x: Math.sin(radians),
    //     y: Math.cos(radians)
    //   }
    //   void new Puppet({
    //     x: this.feature.body.position.x,
    //     y: this.feature.body.position.y,
    //     direction: unitVector,
    //     vertices: [
    //       { x: 0, y: this.radius },
    //       { x: -this.radius, y: -this.radius },
    //       { x: this.radius, y: -this.radius }
    //     ]
    //   })
    // }
    Character.it?.loseIt()
    this.controllable = false
    this.setColor('white')
    Character.it = this
    setTimeout(() => {
      this.controllable = true

      this.setColor('red')
    }, 5000)
  }

  setColor (color: string): void {
    this.feature.body.render.fillStyle = color
    this.feature.body.render.strokeStyle = color
  }
}
