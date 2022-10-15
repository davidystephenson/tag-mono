import Matter from 'matter-js'
import Input from '../shared/Input'
import Actor from './Actor'
import Bot from './Bot'
import CircleFeature from './CircleFeature'
import Feature from './Feature'
import { isPointInVisionRange } from './math'
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
  constructor ({ blue = 0, green = 128, radius = 15, red = 0, stage, x = 0, y = 0 }: {
    blue?: number
    green?: number
    radius?: number
    red?: number
    stage: Stage
    x: number
    y: number
  }) {
    const feature = new CircleFeature({ blue, green, x, y, radius, red, stage })
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
    this.feature.setColor({ red: 255, green: 0, blue: 0 })
  }

  collide ({ actor }: { actor?: Actor }): void {
    this.checkTag({ actor })
  }

  checkTag ({ actor }: { actor?: Actor }): void {
    if (actor != null && this.stage.it === actor) {
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
    this.feature.setColor({ red: 0, green: 128, blue: 0 })
  }

  loseReady (): void {
    this.ready = false
    this.feature.setColor({ red: 255, green: 255, blue: 255 })
  }

  makeIt ({ predator }: { predator: Character }): void {
    if (this.stage.debugMakeIt) console.log('makeIt', this.feature.body.id)
    if (this.stage.it === this) {
      throw new Error('Already it')
    }
    predator.loseIt({ prey: this })
    this.loseReady()
    this.feature.setColor({ red: 255, green: 255, blue: 255 })
    this.stage.it = this
    this.stage.timeout(5000, this.beReady)
  }
}
