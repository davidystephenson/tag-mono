import Matter from 'matter-js'
import Input from '../shared/Input'
import { vectorToPoint } from '../shared/math'
import { VISION_HEIGHT, VISION_WIDTH } from '../shared/VISION'
import Actor from './Actor'
import Bot, { Profile } from './Bot'
import Brick from './Brick'
import CircleFeature from './CircleFeature'
import Feature from './Feature'
import { boxToTriangle, getDistance, isPointInVisionRange } from './math'
import Puppet from './Puppet'
import Scenery from './Scenery'
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
  quadrant?: number
  quadrantTime?: number
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
    this.stage.characterBodies.push(this.feature.body)
    this.stage.characters.set(this.feature.body.id, this)
    if (this.stage.characters.size === 1) setTimeout(() => this.makeIt({ oldIt: this }), 300)
  }

  act (): void {
    super.act()
    if (this.stage.it === this) {
      const quadrant = this.stage.getQuadrant(this.feature.body.position)
      if (this.quadrant !== quadrant) {
        this.quadrant = quadrant
        this.quadrantTime = Date.now()
      }
      const now = Date.now()
      if (this.quadrantTime != null && now - this.quadrantTime > 5000) {
        void new Bot({ stage: this.stage, x: 0, y: 0 })
        this.quadrantTime = now
      }
    } else {
      this.quadrant = undefined
      this.quadrantTime = undefined
    }
    if (this.stage.debugCharacters) {
      this.stage.circle({
        color: this.feature.body.render.strokeStyle,
        radius: 7,
        x: this.feature.body.position.x,
        y: this.feature.body.position.y
      })
    }
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
    this.ready = true
    if (this.stage.it === this) {
      this.feature.setColor({ red: 255, green: 0, blue: 0 })
    } else {
      this.feature.setColor({ red: 0, green: 128, blue: 0 })
    }
  }

  collide ({ actor }: { actor?: Actor }): void {
    if (actor != null && this.stage.it === actor) {
      const it = actor as Character
      if (it.ready && this.ready) {
        this.makeIt({ oldIt: it })
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

  getDistance (point: Matter.Vector): number {
    return getDistance(this.feature.body.position, point)
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
      radius: this.feature.getRadius() * 0.9
    })
    return isVisible
  }

  isPointInRange (point: Matter.Vector): boolean {
    return isPointInVisionRange({ start: this.feature.body.position, end: point })
  }

  isPointWallOpen ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    return this.stage.raycast.isPointOpen({
      start: this.feature.body.position,
      end: point,
      radius: this.feature.getRadius(),
      obstacles: this.stage.wallBodies,
      debug
    })
  }

  isPointWallShown ({ debug, point }: { debug?: boolean, point: Matter.Vector }): boolean {
    return this.stage.raycast.isPointShown({
      debug,
      end: point,
      obstacles: this.stage.wallBodies,
      radius: this.feature.getRadius(),
      start: this.feature.body.position
    })
  }

  loseIt ({ newIt }: { newIt: Character }): Scenery {
    this.blocked = false
    this.loseReady()
    const radius = this.feature.getRadius()
    const thisPoint = vectorToPoint(this.feature.body.position)
    this.stage.circle({
      color: 'red', radius: 15, x: thisPoint.x, y: thisPoint.y
    })
    const northY = this.feature.body.position.y - VISION_HEIGHT
    const southY = this.feature.body.position.y + VISION_HEIGHT
    const westX = this.feature.body.position.x - VISION_WIDTH
    const eastX = this.feature.body.position.x + VISION_WIDTH
    const north = { x: thisPoint.x, y: northY }
    const south = { x: thisPoint.x, y: southY }
    const west = { x: westX, y: thisPoint.y }
    const east = { x: eastX, y: thisPoint.y }
    const northEast = { x: eastX, y: northY }
    const southEast = { x: eastX, y: southY }
    const southWest = { x: westX, y: southY }
    const northWest = { x: westX, y: northY }
    const obstacles = this.stage.bodies.filter(body => body.id !== this.feature.body.id)
    const northHit = this.stage.raycast.getHit({ start: thisPoint, end: north, obstacles })
    const southHit = this.stage.raycast.getHit({ start: thisPoint, end: south, obstacles })
    const westHit = this.stage.raycast.getHit({ start: thisPoint, end: west, obstacles })
    const eastHit = this.stage.raycast.getHit({ start: thisPoint, end: east, obstacles })
    const sideEntryPoints = [northHit.entryPoint, eastHit.entryPoint, southHit.entryPoint, westHit.entryPoint]
    console.log('sideEntryPoints', sideEntryPoints)
    sideEntryPoints.forEach(point => this.stage.circle({
      color: 'limegreen', radius: 7, x: point.x, y: point.y
    }))
    const sideDistances = sideEntryPoints.map(point => this.getDistance(point))
    const [northDistance, eastDistance, southDistance, westDistance] = sideDistances
    const maximum = Math.max(...sideDistances)
    const sideIndex = sideDistances.indexOf(maximum)
    const sideNorthWest = { x: thisPoint.x - westDistance, y: thisPoint.y - northDistance }
    const sideNorthEast = { x: thisPoint.x + eastDistance, y: thisPoint.y - northDistance }
    const sideSouthEast = { x: thisPoint.x + eastDistance, y: thisPoint.y + southDistance }
    const sideSouthWest = { x: thisPoint.x - westDistance, y: thisPoint.y + southDistance }
    this.stage.line({
      color: sideIndex === 0 ? 'white' : 'limegreen',
      end: sideNorthEast,
      start: sideNorthWest
    })
    this.stage.line({
      color: sideIndex === 1 ? 'white' : 'limegreen',
      end: sideSouthEast,
      start: sideNorthEast
    })
    this.stage.line({
      color: sideIndex === 2 ? 'white' : 'limegreen',
      end: sideSouthWest,
      start: sideSouthEast
    })
    this.stage.line({
      color: sideIndex === 3 ? 'white' : 'limegreen',
      end: sideNorthWest,
      start: sideSouthWest
    })
    const farthestSidePoint = sideEntryPoints[sideIndex]
    this.stage.circle({
      color: 'white',
      radius: 5,
      x: farthestSidePoint.x,
      y: farthestSidePoint.y
    })
    const horizontal = [1, 3].includes(sideIndex)
    const box = { center: thisPoint, height: 2 * radius, width: 2 * radius }
    const visibleFeatures = this.getVisibleFeatures()
    const visibleBodies = visibleFeatures.map(feature => feature.body)
    if (horizontal) {
      console.log('horizontal case')
      const corners = []
      if (farthestSidePoint.x > thisPoint.x) {
        console.log('right side')
        console.log('farthestSidePoint', farthestSidePoint)
        const botNorth = { x: thisPoint.x + radius, y: northY }
        const botSouth = { x: thisPoint.x + radius, y: southY }
        corners.push(...[botNorth, northEast, southEast, botSouth])
      }
      if (farthestSidePoint.x < thisPoint.x) {
        console.log('left side')
        const botNorth = { x: thisPoint.x - radius, y: northY }
        const botSouth = { x: thisPoint.x - radius, y: southY }
        corners.push(...[northWest, botNorth, botSouth, southWest])
      }
      corners.forEach(corner => this.stage.circle({
        color: 'red', radius: 10, x: corner.x, y: corner.y
      }))
      corners.forEach((corner, index, corners) => {
        this.stage.line({
          color: 'red',
          end: corners[(index + 1) % corners.length],
          start: corners[index]
        })
      })
      const queryBounds = Matter.Bounds.create(corners)
      const boxQuery0 = Matter.Query.region(visibleBodies, queryBounds)
      const boxQuery = boxQuery0.filter(body => {
        // if (body.label === 'wall') {
        //   return true
        // }
        const points = [...body.vertices, body.position]
        const noPointInRange = points.every(point => !this.isPointInRange(point))
        if (noPointInRange) return true
        return points.some(point => this.isPointWallShown({ point }))
      })
      const bottoms = boxQuery.map(body => body.bounds.max.y)
      const tops = boxQuery.map(body => body.bounds.min.y)
      const bottomsAbove = bottoms.filter(y => y < thisPoint.y)
      const topsBelow = tops.filter(y => y > thisPoint.y)
      if (farthestSidePoint.x > thisPoint.x) {
        const lefts = boxQuery.map(body => body.bounds.min.x)
        const leftsRight = lefts.filter(x => x > thisPoint.x + radius)
        console.log('visibleBoxQuery.length', boxQuery.length)
        console.log('leftsRight', leftsRight)
        farthestSidePoint.x = Math.min(...leftsRight, farthestSidePoint.x)
      } else {
        const rights = boxQuery.map(body => body.bounds.max.x)
        const rightsLeft = rights.filter(x => x < thisPoint.x - radius)
        farthestSidePoint.x = Math.max(...rightsLeft, farthestSidePoint.x)
      }
      boxQuery.forEach(body => this.stage.circle({
        color: 'magenta',
        radius: 15,
        x: body.position.x,
        y: body.position.y
      }))
      const yMin = Math.max(...bottomsAbove, northY)
      const yMax = Math.min(...topsBelow, southY)
      const offset = Math.sign(farthestSidePoint.x - thisPoint.x) * radius * 1
      console.log('offset', offset)
      box.center = { x: 0.5 * (thisPoint.x + offset) + 0.5 * farthestSidePoint.x, y: 0.5 * yMin + 0.5 * yMax }
      box.height = (yMax - yMin) * 0.9
      box.width = Math.abs(thisPoint.x + offset - farthestSidePoint.x) * 0.9
      console.log('botPoint', thisPoint)
      console.log('farthestSidePoint', farthestSidePoint)
      console.log('box', box)
    } else {
      console.log('vertical case')
      const corners = []
      if (farthestSidePoint.y > thisPoint.y) {
        console.log('far point below')
        const botEast = { x: eastX, y: thisPoint.y + radius }
        const botWest = { x: westX, y: thisPoint.y + radius }
        corners.push(...[botWest, botEast, southEast, southWest])
      }
      if (farthestSidePoint.y < thisPoint.y) {
        console.log('far point above')
        const botEast = { x: eastX, y: thisPoint.y - radius }
        const botWest = { x: westX, y: thisPoint.y - radius }
        corners.push(...[northWest, northEast, botEast, botWest])
      }
      corners.forEach(corner => this.stage.circle({
        color: 'red',
        radius: 10,
        x: corner.x,
        y: corner.y
      }))
      corners.forEach((corner, index, corners) => {
        this.stage.line({
          color: 'red',
          end: corners[(index + 1) % corners.length],
          start: corners[index]
        })
      })
      const queryBounds = Matter.Bounds.create(corners)
      const boxQuery0 = Matter.Query.region(visibleBodies, queryBounds)
      const boxQuery = boxQuery0.filter(body => {
        const points = [...body.vertices, body.position]
        const noPointInRange = points.every(point => !this.isPointInRange(point))
        if (noPointInRange) return true
        return points.some(point => this.isPointWallShown({ point }))
      })
      const rights = boxQuery.map(body => body.bounds.max.x)
      const lefts = boxQuery.map(body => body.bounds.min.x)
      const rightsWest = rights.filter(x => x < thisPoint.x)
      const leftsEast = lefts.filter(x => x > thisPoint.x)
      if (farthestSidePoint.y > thisPoint.y) {
        console.log('below case')
        const tops = boxQuery.map(body => body.bounds.min.y)
        const topsBelow = tops.filter(y => y > thisPoint.y + radius)
        console.log('topsBelow.length', topsBelow.length)
        farthestSidePoint.y = Math.min(...topsBelow, farthestSidePoint.y)
      } else {
        console.log('above case')
        const bottoms = boxQuery.map(body => body.bounds.max.y)
        const bottomsAbove = bottoms.filter(y => y < thisPoint.y - radius)
        farthestSidePoint.y = Math.max(...bottomsAbove, farthestSidePoint.y)
      }
      boxQuery.forEach(body => this.stage.circle({
        color: 'magenta',
        radius: 15,
        x: body.position.x,
        y: body.position.y
      }))
      const xMin = Math.max(...rightsWest, westX)
      const xMax = Math.min(...leftsEast, eastX)
      const offset = Math.sign(farthestSidePoint.y - thisPoint.y) * radius
      box.center = { x: 0.5 * xMin + 0.5 * xMax, y: 0.5 * (thisPoint.y + offset) + 0.5 * farthestSidePoint.y }
      box.width = (xMax - xMin)
      box.height = Math.abs(thisPoint.y + offset - farthestSidePoint.y) * 0.9
      console.log('box', box)
      console.log('botPoint', thisPoint)
      console.log('farthestSidePoint', farthestSidePoint)
    }
    const halfWidth = 0.5 * box.width
    const halfHeight = 0.5 * box.height
    const northEastCorner = { x: box.center.x + halfWidth, y: box.center.y - halfHeight }
    const southWestCorner = { x: box.center.x - halfWidth, y: box.center.y + halfHeight }
    const southEastCorner = { x: box.center.x + halfWidth, y: box.center.y + halfHeight }
    const northWestCorner = { x: box.center.x - halfWidth, y: box.center.y - halfHeight }
    const corners = [northWestCorner, northEastCorner, southEastCorner, southWestCorner]
    corners.forEach((corner, index, corners) => {
      this.stage.line({
        color: 'yellow',
        end: corners[(index + 1) % corners.length],
        start: corners[index]
      })
    })
    const boxArea = box.width * box.height
    const minimumArea = radius * 2 * radius * 2
    console.log('area:', boxArea, 'minimum:', minimumArea)
    if (boxArea < minimumArea) {
      console.log('small box:', box)

      box.width = radius * 2
      box.height = radius * 2
    }
    const margin = 1500 - Character.MARGIN
    if (box.center.x < -margin) {
      console.log('outside west box')
      box.center.x = -margin
    }
    if (box.center.x > margin) {
      console.log('outside east box')
      box.center.x = margin
    }
    if (box.center.y < -margin) {
      console.log('outside north box')
      box.center.y = -margin
    }
    if (box.center.y > margin) {
      console.log('outside south box')
      box.center.y = margin
    }

    /*
    const queryBounds = Matter.Bounds.create(corners)
    const queryBody = Matter.Bodies.rectangle(box.center.x, box.center.y, box.width, box.height)
    const boxQuery0 = Matter.Query.region(Feature.bodies, queryBounds)
    const boxQuery = boxQuery0 .filter(body => {
      console.log('queryBody.vertices[0]', queryBody.vertices[0])
      console.log('body.vertices[0]', body.vertices[0])
      // @ts-expect-error
      return Matter.Collision.collides(queryBody, body)
    })
    boxQuery.forEach(body => {
      console.log(body.label, body.position)
      void new DebugCircle({ x: body.position.x, y: body.position.y, radius: 13, color: 'orange' })
    })
    */
    const isBoxClear = true // boxQuery.length === 0
    if (isBoxClear) {
      console.log('prey.moving test:', newIt.moving)
      console.log('prey.blocked test:', newIt.blocked)
      const struggling = newIt.moving && newIt.blocked
      console.log('struggling test:', struggling)
      console.log('unscaled box test:', box)
      this.stage.circle({
        color: 'white',
        radius: 6,
        x: box.center.x,
        y: box.center.y
      })
      const halfWidth = 0.5 * box.width
      const halfHeight = 0.5 * box.height
      const northEastCorner = { x: box.center.x + halfWidth, y: box.center.y - halfHeight }
      const southWestCorner = { x: box.center.x - halfWidth, y: box.center.y + halfHeight }
      const southEastCorner = { x: box.center.x + halfWidth, y: box.center.y + halfHeight }
      const northWestCorner = { x: box.center.x - halfWidth, y: box.center.y - halfHeight }
      const corners = [northWestCorner, northEastCorner, southEastCorner, southWestCorner]
      corners.forEach((corner, index, corners) => {
        // void new DebugCircle({ x: corner.x, y: corner.y, radius: 6, color: 'yellow' })
        this.stage.line({
          color: 'aqua',
          end: corners[(index + 1) % corners.length],
          start: corners[index]
        })
      })
      if (struggling) {
        const speed = Matter.Vector.magnitude(this.feature.body.velocity)
        const scale = Math.min(1, speed)
        console.log('horizontal', horizontal)
        /*
        const boxWidth = horizontal ? Math.sign(this.feature.body.position.x - box.center.x) * 0.5 * box.width * (1 - scale) : 0
        const boxHeight = !horizontal ? Math.sign(this.feature.body.position.y - box.center.y) * 0.5 * box.height * (1 - scale) : 0
        console.log('boxHeight', boxHeight)
        console.log('boxWidth', boxWidth)
        */
        const verts = boxToTriangle({ box, radius: radius, scale, sign: Math.sign(this.feature.body.position.x - box.center.x) })
        console.log('verts test:', verts)
        const absVerts = verts.map(vert => ({ x: vert.x + box.center.x, y: vert.y + box.center.y }))
        const center = Matter.Vertices.centre(absVerts)
        console.log('center test:', center)
        const v = newIt.feature.body.velocity
        const even = Math.min(box.height, box.width) / Math.max(box.height, box.width)
        const maxSize = VISION_WIDTH * 0.5
        const size = Math.min(1, speed / 4) * Math.max(box.height, box.width)
        const m = even * Matter.Vector.magnitude(v)
        const z = (0.8 * m / 5 * size / maxSize) ** 3
        console.log('z test:', z)
        const direction = vectorToPoint(v)
        return new Puppet({
          x: center.x,
          y: center.y,
          direction,
          force: z,
          stage: this.stage,
          vertices: verts
        })
      } else {
        const speed = Matter.Vector.magnitude(this.feature.body.velocity)
        const scale = speed === 0 ? 1 : Math.min(1, speed / 2)
        const scaledWidth = box.width * scale
        const scaledHeight = box.height * scale
        const brickWidth = scaledWidth > radius * 2 ? scaledWidth : box.width
        const brickHeight = scaledHeight > radius * 2 ? scaledHeight : box.height
        /*
        const boxWidth = horizontal
          ? Math.sign(this.feature.body.position.x - box.center.x) * 0.5 * box.width * (1 - scale)
          : 0
        */
        // const boxHeight = !horizontal ? Math.sign(this.feature.body.position.y - box.center.y) * 0.5 * box.height * (1 - scale) : 0
        console.log('brickWidth', brickWidth)
        console.log('brickHeight', brickHeight)
        return new Brick({
          x: box.center.x,
          y: box.center.y,
          width: brickWidth,
          height: brickHeight,
          stage: this.stage
        })
      }
    } else {
      this.stage.paused = true
      throw new Error('Unclear scenery')
    }
  }

  loseReady (): void {
    super.loseReady()
    this.ready = false
    this.feature.setColor({ red: 255, green: 255, blue: 255 })
    setTimeout(this.beReady, 2000)
  }

  makeIt ({ oldIt }: { oldIt?: Character }): void {
    if (this.stage.debugMakeIt) console.log('makeIt', this.feature.body.id)
    if (this.stage.it === this) {
      // throw new Error('Already it')
    }
    const profiles: Profile[] = []
    this.stage.characters.forEach(character => {
      if (character === this || character === oldIt) return
      const distance = this.getDistance(character.feature.body.position)
      profiles.push({ character, distance })
    })
    profiles.sort((a, b) => a.distance - b.distance)
    const bystander = profiles.find(profile => {
      const isVisible = this.isFeatureVisible(profile.character.feature)
      return isVisible
    })?.character
    bystander?.destroy()
    oldIt?.loseIt({ newIt: this })
    this.stage.it = this
    this.feature.setColor({ red: 255, green: 0, blue: 0 })
    this.stage.characters.forEach(character => {
      if (character !== this && this.isFeatureVisible(character.feature)) {
        const fromPoint = this.feature.body.position
        const pushPoint = character.feature.body.position
        const distance = this.getDistance(pushPoint)
        const direction = Matter.Vector.normalise(Matter.Vector.sub(pushPoint, fromPoint))
        const power = this.stage.engine.timing.timestamp < 1000 ? 0 : 2000000 / Math.max(distance, 30)
        const force = Matter.Vector.mult(direction, power)
        Matter.Body.applyForce(character.feature.body, pushPoint, force)
        Matter.Body.update(character.feature.body, 0.01, 1, 0)
        character.loseReady()
      }
    })
  }
}
