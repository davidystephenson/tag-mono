import Matter from 'matter-js'
import Input from '../shared/Input'
import { vectorToPoint } from '../shared/math'
import { VISION_HEIGHT, VISION_WIDTH } from '../shared/VISION'
import Actor from './Actor'
import { Profile } from './Bot'
import Brick from './Brick'
import CircleFeature from './CircleFeature'
import Feature from './Feature'
import { boxToTriangle, getDistance, isPointInVisionRange } from './math'
import Puppet from './Puppet'
import PropActor from './PropActor'
import Stage from './Stage'
import { Goal, Heading } from './types'

export default class Character extends Actor {
  static MAXIMUM_RADIUS = 15
  static MARGIN = Character.MAXIMUM_RADIUS + 1
  static IT_COLOR = { blue: 0, green: 0, red: 255 }
  static NOT_IT_COLOR = { blue: 0, green: 128, red: 0 }
  static OBSERVER_COLOR = { blue: 255, green: 255, red: 255 }

  isPlayer = false
  blocked = true // Philosophical
  controls = new Input().controls
  declare feature: CircleFeature
  force = 0.0001
  headings: Record<number, Heading[]> = {}
  moving = false
  observer = false
  ready = true
  constructor ({
    blue = Character.NOT_IT_COLOR.blue,
    green = Character.NOT_IT_COLOR.green,
    radius = 15,
    red = Character.NOT_IT_COLOR.red,
    stage,
    x = 0,
    y = 0
  }: {
    blue?: number
    green?: number
    radius?: number
    red?: number
    stage: Stage
    x: number
    y: number
  }) {
    const allIts = stage.getAllIts()
    const noIts = allIts.length === 0
    const feature = noIts
      ? new CircleFeature({
        blue: Character.IT_COLOR.blue,
        green: Character.IT_COLOR.green,
        x,
        y,
        radius,
        red: Character.IT_COLOR.red,
        stage
      })
      : new CircleFeature({ blue, green, x, y, radius, red, stage })
    feature.body.label = 'character'
    super({ feature, stage })
    this.stage.characterBodies.push(this.feature.body)
    this.stage.characters.set(this.feature.body.id, this)
    this.initializeHeadings()
  }

  act (): void {
    super.act()
    if (this.stage.debugCharacters) {
      this.stage.circle({
        color: this.feature.body.render.strokeStyle,
        radius: 10,
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
    if (this.observer) {
      this.feature.setColor(Character.OBSERVER_COLOR)
    } else {
      this.ready = true
      this.feature.setColor({ ...Character.IT_COLOR, alpha: 1 })
    }
  }

  collide ({ actor, body, delta, normal, scale }: {
    actor?: Actor
    body: Matter.Body
    delta?: number
    normal: Matter.Vector
    scale?: number
  }): void {
    if (actor != null && actor.feature.body.label === 'character') {
      const character = actor as Character
      if (character.ready && this.ready && character.isIt() && !this.isIt()) {
        this.makeIt({ oldIt: character })
        this.loseReady({})
      }
    }
    super.collide({ actor, body, delta, normal, scale })
  }

  destroy (): void {
    super.destroy()
    this.stage.characters.delete(this.feature.body.id)
    this.stage.characterBodies = this.stage.characterBodies.filter(body => body.id !== this.feature.body.id)
  }

  exploreHeading ({ heading }: { heading: Heading }): Heading {
    const group = this.getGroup()
    this.headings[group][heading.waypoint.id].time = Date.now()
    heading.explored = true
    return heading
  }

  getDistance (point: Matter.Vector): number {
    return getDistance(this.feature.body.position, point)
  }

  getExploreHeading ({ debug, goals }: { debug?: boolean, goals?: Goal[] }): Heading | null {
    const group = this.getGroup()
    const headings = this.headings[group]
    const inRangeHeadings = headings.filter(heading => this.isPointInRange(heading.waypoint.position))
    const wallClearHeadings = inRangeHeadings.filter(heading => {
      return this.stage.raycast.isPointClear({
        debug,
        end: heading.waypoint.position,
        start: this.feature.body.position,
        obstacles: this.stage.wallBodies
      })
    })
    const isOneWall = wallClearHeadings.length === 1
    if (isOneWall) {
      const heading = wallClearHeadings[0]
      if (debug === true) {
        this.stage.circle({
          color: 'white',
          radius: 5,
          x: heading.waypoint.position.x,
          y: heading.waypoint.position.y
        })
        this.stage.paused = true
      }
      if (!heading.explored) {
        heading.tight = true
      }
      return heading
    }
    const otherCharacterBodies = this.stage.characterBodies.filter(body => body !== this.feature.body)
    const characterClearHeadings = wallClearHeadings.filter((heading) => {
      return this.stage.raycast.isPointClear({
        debug,
        end: heading.waypoint.position,
        obstacles: otherCharacterBodies,
        start: this.feature.body.position
      })
    }, {})
    const isOneCharacter = characterClearHeadings.length === 1
    if (isOneCharacter) {
      if (debug === true) {
        wallClearHeadings.forEach(heading => {
          this.stage.circle({
            color: 'limegreen',
            radius: 5,
            x: heading.waypoint.position.x,
            y: heading.waypoint.position.y
          })
          this.stage.raycast.isPointClear({
            debug: true,
            end: heading.waypoint.position,
            obstacles: otherCharacterBodies,
            start: this.feature.body.position
          })
          const collisions = this.stage.raycast.raycast({ end: heading.waypoint.position, start: this.feature.body.position, obstacles: otherCharacterBodies })
          collisions.forEach(collision => {
            this.stage.circle({
              color: 'aqua',
              radius: 5,
              x: collision.bodyA.position.x,
              y: collision.bodyA.position.y
            })
            this.stage.circle({
              color: 'hotpink',
              radius: 5,
              x: collision.bodyB.position.x,
              y: collision.bodyB.position.y
            })
          })
        })
        characterClearHeadings.forEach(heading => {
          this.stage.circle({
            color: 'aqua',
            radius: 5,
            x: heading.waypoint.position.x,
            y: heading.waypoint.position.y
          })
        })

        inRangeHeadings.forEach(heading => {
          this.stage.circle({
            color: 'orange',
            radius: 5,
            x: heading.waypoint.position.x,
            y: heading.waypoint.position.y
          })
        })
      }
      const heading = characterClearHeadings[0]
      if (!heading.explored) {
        heading.tight = true
      }
      return heading
    }
    if (characterClearHeadings.length === 0) {
      if (wallClearHeadings.length === 0) {
        return null
      }
      return this.getEarlyFarHeading({ headings: wallClearHeadings, tight: true })
    } else {
      if (goals != null) {
        const clearGoals = goals.filter(goal => characterClearHeadings.find(heading => heading.waypoint.id === goal.heading.waypoint.id))
        if (clearGoals.length === characterClearHeadings.length) {
          const unscoredGoals = clearGoals.filter(goals => !goals.scored)
          if (unscoredGoals.length === 1) {
            const goal = unscoredGoals[0]
            goal.heading.tight = true
            return this.exploreHeading({ heading: goal.heading })
          }
        }
      }
      return this.getEarlyFarHeading({ headings: characterClearHeadings })
    }
  }

  getGroup (): number {
    const radius = this.feature.getRadius()
    const ceiled = Math.ceil(radius)
    const capped = Math.min(ceiled, Character.MAXIMUM_RADIUS)
    return capped
  }

  getEarlyFarHeading ({ headings, tight }: { headings: Heading[], tight?: boolean }): Heading {
    const unexploredHeadings = headings.filter(heading => !heading.explored)
    if (unexploredHeadings.length === 1) {
      const unexploredHeading = unexploredHeadings[0]
      unexploredHeading.tight = true
      return this.exploreHeading({ heading: unexploredHeading })
    }
    const earlyHeading = headings.reduce((headingA, headingB) => {
      if (headingA.time < headingB.time) return headingA
      return headingB
    })
    const earlyHeadings = headings.filter(heading => heading.time === earlyHeading.time)
    earlyHeadings[0].distance = this.getDistance(earlyHeadings[0].waypoint.position)
    const farHeading = earlyHeadings.reduce((headingA, headingB) => {
      headingB.distance = this.getDistance(headingB.waypoint.position)
      if (headingA.distance > headingB.distance) {
        return headingB
      }
      return headingA
    })
    if (tight === true) {
      farHeading.tight = true
    }
    return this.exploreHeading({ heading: farHeading })
  }

  getInRangeFeatures (): Feature[] {
    const inRangeFeatures: Feature[] = []
    this.stage.features.forEach(feature => {
      const isInRange = this.isFeatureInRange(feature)
      if (isInRange) inRangeFeatures.push(feature)
    })
    return inRangeFeatures
  }

  setRadiusColor (): void {
    const radius = this.feature.getRadius()
    const radiusDifference = Character.MAXIMUM_RADIUS - radius
    const radiusRatio = radiusDifference / 5
    const greenGrowth = (radiusRatio * Character.NOT_IT_COLOR.green)
    const green = Character.NOT_IT_COLOR.green + greenGrowth
    const greenRound = Math.ceil(green)
    const blue = radiusRatio * PropActor.BLUE
    const blueRound = Math.ceil(blue)
    this.feature.setColor({ green: greenRound, blue: blueRound, red: 0 })
  }

  getVisibleFeatures (): Feature[] {
    const visibleFeatures: Feature[] = []
    this.stage.features.forEach(feature => {
      const isVisible = this.isFeatureVisible(feature)
      if (isVisible) visibleFeatures.push(feature)
    })
    return visibleFeatures
  }

  initializeHeadings (): void {
    this.stage.radii.forEach(radius => {
      this.headings[radius] = this.stage.waypointGroups[radius].map((waypoint) => {
        const distance = this.getDistance(waypoint.position)
        const time = -distance
        return { waypoint, time, distance, only: false, tight: false, explored: false }
      })
    })
  }

  isFeatureInRange (feature: Feature): boolean {
    return feature.isInRange({ point: this.feature.body.position })
  }

  isFeatureVisible (feature: Feature): boolean {
    const debug = this.stage.debugPlayerVision && this.isPlayer
    const isVisible = feature.isVisible({
      center: this.feature.body.position,
      radius: this.feature.getRadius() * 0.9,
      debug
    })
    return isVisible
  }

  isObserverColor (): boolean {
    if (this.feature.red !== Character.OBSERVER_COLOR.red) {
      return false
    }

    if (this.feature.green !== Character.OBSERVER_COLOR.green) {
      return false
    }

    if (this.feature.blue !== Character.OBSERVER_COLOR.blue) {
      return false
    }

    return true
  }

  isIt (): boolean {
    if (this.feature.red !== Character.IT_COLOR.red) {
      return false
    }

    if (this.isObserverColor() && !this.observer) {
      return true
    }

    if (this.feature.green !== Character.IT_COLOR.green) {
      return false
    }

    if (this.feature.blue !== Character.IT_COLOR.blue) {
      return false
    }

    return true
  }

  isPointClose ({ point, limit = 45 }: { point: Matter.Vector, limit?: number }): boolean {
    const distance = this.getDistance(point)
    const close = distance < limit
    return close
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

  loseIt ({ newIt }: { newIt: Character }): PropActor | undefined {
    this.blocked = false
    if (!this.stage.spawnOnTag) {
      return undefined
    }
    this.feature.setColor(Character.NOT_IT_COLOR)
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
    // console.log('sideEntryPoints', sideEntryPoints)
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
      // console.log('horizontal case')
      const corners = []
      if (farthestSidePoint.x > thisPoint.x) {
        // console.log('right side')
        // console.log('farthestSidePoint', farthestSidePoint)
        const botNorth = { x: thisPoint.x + radius, y: northY }
        const botSouth = { x: thisPoint.x + radius, y: southY }
        corners.push(...[botNorth, northEast, southEast, botSouth])
      }
      if (farthestSidePoint.x < thisPoint.x) {
        // console.log('left side')
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
        // console.log('visibleBoxQuery.length', boxQuery.length)
        // console.log('leftsRight', leftsRight)
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
      // console.log('offset', offset)
      box.center = { x: 0.5 * (thisPoint.x + offset) + 0.5 * farthestSidePoint.x, y: 0.5 * yMin + 0.5 * yMax }
      box.height = (yMax - yMin) * 0.9
      box.width = Math.abs(thisPoint.x + offset - farthestSidePoint.x) * 0.9
      // console.log('botPoint', thisPoint)
      // console.log('farthestSidePoint', farthestSidePoint)
      // console.log('box', box)
    } else {
      // console.log('vertical case')
      const corners = []
      if (farthestSidePoint.y > thisPoint.y) {
        // console.log('far point below')
        const botEast = { x: eastX, y: thisPoint.y + radius }
        const botWest = { x: westX, y: thisPoint.y + radius }
        corners.push(...[botWest, botEast, southEast, southWest])
      }
      if (farthestSidePoint.y < thisPoint.y) {
        // console.log('far point above')
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
        console.log('force test:', z)
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
        // console.log('brickWidth', brickWidth)
        // console.log('brickHeight', brickHeight)
        return new Brick({
          x: box.center.x,
          y: box.center.y,
          width: brickWidth,
          height: brickHeight,
          stage: this.stage
        })
      }
    } else {
      throw new Error('Unclear prop spawn')
    }
  }

  loseReady ({ time = 5000 }: {
    time?: number
  }): void {
    this.ready = false
    this.feature.setColor(Character.OBSERVER_COLOR)
    setTimeout(this.beReady, time)
  }

  makeIt ({ oldIt }: { oldIt?: Character }): void {
    if (this.stage.debugMakeIt) console.debug('makeIt', this.feature.body.id)
    if (this.isIt()) {
      throw new Error('Already it')
    }
    const profiles: Profile[] = []
    this.stage.characters.forEach(character => {
      if (character.isIt() || character === oldIt || character === this) return
      const distance = this.getDistance(character.feature.body.position)
      profiles.push({ character, distance })
    })
    profiles.sort((a, b) => a.distance - b.distance)
    const bystander = profiles.find(profile => {
      if (profile.character === oldIt || profile.character.isPlayer || profile.character.isIt()) return false
      const isVisible = this.isFeatureVisible(profile.character.feature)
      return isVisible
    })?.character
    bystander?.destroy()
    const spawnLimit = this.stage.getSpawnLimit()
    this.stage.spawnTime = this.stage.spawnTime + spawnLimit
    const radius = this.feature.getRadius()
    const needed = 15 / radius
    Matter.Body.scale(this.feature.body, needed, needed)
    const propActor = oldIt?.loseIt({ newIt: this })
    if (this.stage.engine.timing.timestamp > 1000) {
      const inRangeFeatures = this.getInRangeFeatures()
      inRangeFeatures.forEach(feature => {
        if (
          feature.body.id !== this.feature.body.id &&
          feature.body.id !== propActor?.feature.body.id &&
          !feature.body.isStatic
        ) {
          const distance = this.getDistance(feature.body.position)
          const pushable = feature.body.label === 'character'
            ? this.isFeatureVisible(feature)
            : feature.getArea() > this.feature.getArea()
          if (pushable) {
            const fromPoint = this.feature.body.position
            const pushPoint = feature.body.position
            if (distance <= 0) throw new Error('Push point intersection')
            const difference = Matter.Vector.sub(pushPoint, fromPoint)
            const direction = Matter.Vector.normalise(difference)
            const power = 2000000 / distance
            const force = Matter.Vector.mult(direction, power)
            Matter.Body.applyForce(feature.body, pushPoint, force)
            Matter.Body.update(feature.body, 0.01, 1, 0)
          }
        }
      })
    }
  }
}
