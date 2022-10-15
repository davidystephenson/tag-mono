import Matter from 'matter-js'
import Character from './Character'
import Player from './Player'
import Brick from './Brick'
import Puppet from './Puppet'
import Stage from './Stage'
import Waypoint from './Waypoint'
import Controls, { getRadiansControls, STILL } from '../shared/controls'
import { vectorToPoint } from '../shared/math'
import { VISION_HEIGHT, VISION_WIDTH } from '../shared/VISION'
import { getDistance, whichMin, getAngle, getAngleDifference, whichMax } from './math'

interface Heading {
  waypoint: Waypoint
  time: number
  distance: number
}

interface Profile {
  character: Character
  distance: number
}

export default class Bot extends Character {
  static pathLabels = ['reset', 'unblock', 'pursue', 'flee', 'wander', 'explore', 'lost'] as const
  static TIME_LIMIT = 5000

  path: Matter.Vector[] = []
  pathTime?: number
  pathLabel?: typeof Bot.pathLabels[number]
  headings: Heading[] = []
  unblockTries?: Record<number, boolean>
  constructor ({ radius = 15, stage, x = 0, y = 0 }: {
    radius?: number
    stage: Stage
    x: number
    y: number
  }) {
    super({ x, y, radius, stage })
    this.headings = this.stage.waypoints.map((waypoint) => {
      const distance = this.getDistance(waypoint.position)
      const time = -distance
      return { waypoint, time, distance }
    })
    this.stage.botCount = this.stage.botCount + 1
    if (this.stage.oldest == null) this.stage.oldest = this
  }

  act (): void {
    if (this.stage.debugBotCircles) {
      const debugColor = this.stage.it === this
        ? 'red'
        : this.blocked && this.moving
          ? 'white'
          : this.blocked
            ? 'orange'
            : this.moving
              ? 'limegreen'
              : 'green'

      this.stage.circle({
        color: debugColor,
        radius: 7,
        x: this.feature.body.position.x,
        y: this.feature.body.position.y
      })
    }
    const choice = this.chooseControls()
    this.takeInput(choice)
    super.act()
  }

  chooseControls (): Partial<Controls> {
    const target = this.chooseDirection()
    if (target == null) {
      return STILL
    }
    const radians = Matter.Vector.angle(this.feature.body.position, target)
    const controls = getRadiansControls(radians)
    return controls
  }

  chooseDirection (): Matter.Vector | null {
    if (this.stage.it == null) {
      return null
    }
    const isIt = this.stage.it === this
    const stuck = this.isStuck()
    const bored = this.path.length === 0
    const arriving = !bored && this.isPointClose({ point: this.path[0], limit: 15 })
    const profiles: Profile[] = [] // same as Array.from
    this.stage.characters.forEach(character => {
      if (character === this) return
      if (isIt && !character.ready) return
      if (!isIt && this.stage.it !== character) return
      const distance = this.getDistance(character.feature.body.position)
      profiles.push({ character, distance })
    })
    profiles.sort((a, b) => a.distance - b.distance)
    const enemy = profiles.find(profile => {
      const isVisible = this.isFeatureVisible(profile.character.feature)
      return isVisible
    })?.character

    if (enemy != null) {
      if (isIt) {
        enemy.pursuer = this
        const point = vectorToPoint(enemy.feature.body.position)
        this.setPath({ path: [point], label: 'pursue' })
        return point
      } else {
        this.blocked = this.isBlocked()
        const trapped = this.blocked && (bored || stuck || arriving)
        if (trapped) {
          return this.unblock()
        }
        if (this.pathLabel !== 'unblock') {
          return this.flee()
        }
      }
    } else if (!isIt) {
      this.blocked = false
      this.unblockTries = undefined
    }
    if (stuck || bored || arriving) {
      return this.explore()
    }
    const debug = isIt ? this.stage.debugItChoice : this.stage.debugNotItChoice
    return this.followPath(debug)
  }

  explore (debug = this.stage.debugWander): Matter.Vector | null {
    const inRangeHeadings = this.headings.filter(heading => this.isPointInRange(heading.waypoint.position))
    const wallClearHeadings = inRangeHeadings.filter(heading => {
      return this.stage.raycast.isPointClear({
        debug,
        end: heading.waypoint.position,
        start: this.feature.body.position,
        obstacles: this.stage.wallBodies
      })
    })
    const otherCharacterBodies = this.stage.characterBodies.filter(body => body !== this.feature.body)
    const characterClearHeadings = wallClearHeadings.filter((heading) => {
      return this.stage.raycast.isPointClear({
        debug,
        end: heading.waypoint.position,
        obstacles: otherCharacterBodies,
        start: this.feature.body.position
      })
    }, {})
    if (characterClearHeadings.length === 0) {
      if (wallClearHeadings.length === 0) {
        return this.loseWay()
      }
      this.setHeading({ headings: wallClearHeadings, label: 'wander' })
    } else {
      this.setHeading({ headings: characterClearHeadings, label: 'explore' })
    }
    return this.path[0]
  }

  findPath ({ goal }: {
    goal: Matter.Vector
  }): Matter.Vector | null {
    const goalPoint = vectorToPoint(goal)
    if (this.isPointReachable({ point: goalPoint })) {
      this.path = [goalPoint]
      return goalPoint
    }
    const visibleFromStart = this.stage.waypoints.filter(waypoint => {
      return this.isPointReachable({ point: waypoint.position })
    })
    if (visibleFromStart.length === 0) {
      if (this.stage.debugLost) {
        console.warn('Invisible path start')
      }
      return this.loseWay()
    }

    const visibleFromEnd = this.stage.waypoints.filter(waypoint => {
      return this.stage.raycast.isPointOpen({
        start: waypoint.position,
        end: goalPoint,
        radius: this.radius,
        obstacles: this.stage.wallBodies
      })
    })
    if (visibleFromEnd.length === 0) {
      if (this.stage.debugLost) {
        console.warn('Invisible path goal')
      }
      return this.loseWay()
    }

    const pairs = visibleFromStart.flatMap(a => visibleFromEnd.map(b => [a, b]))
    const distances = pairs.map(pair => {
      const first = pair[0]
      const last = pair[1]
      const startToFirst = this.getDistance(first.position)
      const firstToLast = first.distances[last.id]
      const lastToEnd = getDistance(last.position, goalPoint)
      return startToFirst + firstToLast + lastToEnd
    })
    const pair = whichMin(pairs, distances)
    const last = pair[1]
    const first = pair[0]
    const waypointPath = first.paths[last.id]
    if (waypointPath.length === 0) throw new Error('waypoint path is empty')
    const reversed = [...waypointPath].reverse()
    reversed.unshift(goalPoint)
    this.path = reversed
    const target = this.path[this.path.length - 1]

    return target
  }

  flee (): Matter.Vector {
    if (this.stage.it == null) {
      throw new Error('Fleeing from no one')
    }
    this.setPath({ path: [], label: 'flee' })
    const start = this.feature.body.position
    const itPosition = this.stage.it.feature.body.position
    const itVelocity = this.stage.it.feature.body.velocity
    const avoidPosition = Matter.Vector.add(itPosition, Matter.Vector.mult(itVelocity, 10))
    const avoidDirection = Matter.Vector.sub(start, avoidPosition)
    const toPoint = Matter.Vector.add(start, avoidDirection)
    return toPoint
  }

  followPath (debug?: boolean): Matter.Vector | null {
    const debugging = debug === true || this.stage.debugPathing
    if (debugging) {
      const originIndex = this.path.length - 1
      this.path.slice(0, originIndex).forEach((point, i) => {
        this.stage.line({
          color: 'purple', start: point, end: this.path[i + 1]
        })
      })
      this.stage.circle({
        color: 'purple', radius: 5, x: this.path[0].x, y: this.path[0].y
      })
    }
    const target = this.path.find(point => this.isPointReachable({ point }))
    if (target == null) {
      const target = this.findPath({ goal: this.path[0] })
      if (target == null) return this.loseWay()
      return target
    } else {
      return target
    }
  }

  isBlocked (): boolean {
    if (this.stage.it == null) {
      return false
    }
    const vector = Matter.Vector.sub(this.feature.body.position, this.stage.it.feature.body.position)
    const direction = Matter.Vector.normalise(vector)
    const blockPoint = Matter.Vector.add(this.feature.body.position, Matter.Vector.mult(direction, 30))
    return !this.isPointWallOpen({ point: blockPoint, debug: this.stage.debugChase })
  }

  getDistance (point: Matter.Vector): number {
    return getDistance(this.feature.body.position, point)
  }

  getUnblockPoint (): Matter.Vector | null {
    const eligible = this.stage.waypoints.filter(waypoint => {
      const tried = this.unblockTries?.[waypoint.id] === true
      if (tried) {
        return false
      }
      const reachable = this.isPointReachable({ point: waypoint.position })
      return reachable
    })
    if (eligible.length === 0) return this.loseWay()
    const far = eligible.filter(waypoint => !this.isPointClose({ point: waypoint.position, limit: 45 }))
    if (far.length === 0) return this.loseWay()
    if (this.stage.it == null || this.stage.it === this) {
      throw new Error('No it to unblock from')
    }
    const itAngle = getAngle(this.feature.body.position, this.stage.it.feature.body.position)
    const differences = far.map(waypoint => {
      const angle = getAngle(this.feature.body.position, waypoint.position)
      return getAngleDifference(angle, itAngle)
    })
    const mostDifferent = whichMax(far, differences)
    if (this.unblockTries == null) this.unblockTries = {}
    this.unblockTries[mostDifferent.id] = true
    return mostDifferent.position
  }

  isPointClose ({ point, limit = 45 }: { point: Matter.Vector, limit?: number }): boolean {
    const distance = this.getDistance(point)
    const close = distance < limit
    return close
  }

  isPointReachable ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    const inRange = this.isPointInRange(point)
    if (!inRange) return false
    const clear = this.isPointWallOpen({ point, debug })
    return clear
  }

  isPointWallShown ({ debug, point }: { debug?: boolean, point: Matter.Vector }): boolean {
    return this.stage.raycast.isPointShown({
      debug,
      end: point,
      obstacles: this.stage.wallBodies,
      radius: this.radius,
      start: this.feature.body.position
    })
  }

  isPointWallVisible ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    const inRange = this.isPointInRange(point)
    if (!inRange) return false
    const shown = this.isPointWallShown({ point, debug })
    return shown
  }

  isStuck (): boolean {
    if (this.pathTime == null) return false
    const difference = Date.now() - this.pathTime
    return difference > Bot.TIME_LIMIT
  }

  boxToTriangle ({ box, scale, sign }: {
    box: {
      center: Matter.Vector
      width: number
      height: number
    }
    scale: number
    sign: number
  }): Matter.Vector[] {
    console.log('boxToTriangle')
    const scaleHeight = box.height * scale
    const height = scaleHeight > this.radius * 2 ? scaleHeight : box.height
    const scaledWidth = box.width * scale
    const width = scaledWidth > this.radius * 2 ? scaledWidth : box.width
    const halfHeight = 0.5 * height
    const halfWidth = 0.5 * width
    const topRight = { x: halfWidth, y: -halfHeight }
    const botRight = { x: halfWidth, y: halfHeight }
    const topLeft = { x: -halfWidth, y: -halfHeight }
    const botLeft = { x: -halfWidth, y: halfHeight }
    const weight = 0.5
    console.log('sign', sign)
    if (sign > 0) {
      console.log('point left')
      const point = { x: halfWidth, y: weight * halfHeight - (1 - weight) * halfHeight }
      return [botLeft, topLeft, point]
    }
    console.log('point right')
    const point = { x: -halfWidth, y: weight * halfHeight - (1 - weight) * halfHeight }
    return [botRight, topRight, point]
  }

  loseIt ({ prey }: { prey: Character }): void {
    const botPoint = vectorToPoint(this.feature.body.position)
    this.stage.circle({
      color: 'red', radius: 15, x: botPoint.x, y: botPoint.y
    })
    const northY = this.feature.body.position.y - VISION_HEIGHT
    const southY = this.feature.body.position.y + VISION_HEIGHT
    const westX = this.feature.body.position.x - VISION_WIDTH
    const eastX = this.feature.body.position.x + VISION_WIDTH
    const north = { x: botPoint.x, y: northY }
    const south = { x: botPoint.x, y: southY }
    const west = { x: westX, y: botPoint.y }
    const east = { x: eastX, y: botPoint.y }
    const northEast = { x: eastX, y: northY }
    const southEast = { x: eastX, y: southY }
    const southWest = { x: westX, y: southY }
    const northWest = { x: westX, y: northY }
    const obstacles = this.stage.bodies.filter(body => body.id !== this.feature.body.id)
    const northHit = this.stage.raycast.getHit({ start: botPoint, end: north, obstacles })
    const southHit = this.stage.raycast.getHit({ start: botPoint, end: south, obstacles })
    const westHit = this.stage.raycast.getHit({ start: botPoint, end: west, obstacles })
    const eastHit = this.stage.raycast.getHit({ start: botPoint, end: east, obstacles })
    const sideEntryPoints = [northHit.entryPoint, eastHit.entryPoint, southHit.entryPoint, westHit.entryPoint]
    console.log('sideEntryPoints', sideEntryPoints)
    sideEntryPoints.forEach(point => this.stage.circle({
      color: 'limegreen', radius: 7, x: point.x, y: point.y
    }))
    const sideDistances = sideEntryPoints.map(point => getDistance(botPoint, point))
    const [northDistance, eastDistance, southDistance, westDistance] = sideDistances
    const maximum = Math.max(...sideDistances)
    const sideIndex = sideDistances.indexOf(maximum)
    const sideNorthWest = { x: botPoint.x - westDistance, y: botPoint.y - northDistance }
    const sideNorthEast = { x: botPoint.x + eastDistance, y: botPoint.y - northDistance }
    const sideSouthEast = { x: botPoint.x + eastDistance, y: botPoint.y + southDistance }
    const sideSouthWest = { x: botPoint.x - westDistance, y: botPoint.y + southDistance }
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
    const box = { center: botPoint, height: 2 * this.radius, width: 2 * this.radius }
    const visibleFeatures = this.getVisibleFeatures()
    const visibleBodies = visibleFeatures.map(feature => feature.body)
    if (horizontal) {
      console.log('horizontal case')
      const corners = []
      if (farthestSidePoint.x > botPoint.x) {
        console.log('right side')
        console.log('farthestSidePoint', farthestSidePoint)
        const botNorth = { x: botPoint.x + this.radius, y: northY }
        const botSouth = { x: botPoint.x + this.radius, y: southY }
        corners.push(...[botNorth, northEast, southEast, botSouth])
      }
      if (farthestSidePoint.x < botPoint.x) {
        console.log('left side')
        const botNorth = { x: botPoint.x - this.radius, y: northY }
        const botSouth = { x: botPoint.x - this.radius, y: southY }
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
      const bottomsAbove = bottoms.filter(y => y < botPoint.y)
      const topsBelow = tops.filter(y => y > botPoint.y)
      if (farthestSidePoint.x > botPoint.x) {
        const lefts = boxQuery.map(body => body.bounds.min.x)
        const leftsRight = lefts.filter(x => x > botPoint.x + this.radius)
        console.log('visibleBoxQuery.length', boxQuery.length)
        console.log('leftsRight', leftsRight)
        farthestSidePoint.x = Math.min(...leftsRight, farthestSidePoint.x)
      } else {
        const rights = boxQuery.map(body => body.bounds.max.x)
        const rightsLeft = rights.filter(x => x < botPoint.x - this.radius)
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
      const offset = Math.sign(farthestSidePoint.x - botPoint.x) * this.radius * 1
      console.log('offset', offset)
      box.center = { x: 0.5 * (botPoint.x + offset) + 0.5 * farthestSidePoint.x, y: 0.5 * yMin + 0.5 * yMax }
      box.height = (yMax - yMin) * 0.9
      box.width = Math.abs(botPoint.x + offset - farthestSidePoint.x) * 0.9
      console.log('botPoint', botPoint)
      console.log('farthestSidePoint', farthestSidePoint)
      console.log('box', box)
    } else {
      console.log('vertical case')
      const corners = []
      if (farthestSidePoint.y > botPoint.y) {
        console.log('far point below')
        const botEast = { x: eastX, y: botPoint.y + this.radius }
        const botWest = { x: westX, y: botPoint.y + this.radius }
        corners.push(...[botWest, botEast, southEast, southWest])
      }
      if (farthestSidePoint.y < botPoint.y) {
        console.log('far point above')
        const botEast = { x: eastX, y: botPoint.y - this.radius }
        const botWest = { x: westX, y: botPoint.y - this.radius }
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
      const rightsWest = rights.filter(x => x < botPoint.x)
      const leftsEast = lefts.filter(x => x > botPoint.x)
      if (farthestSidePoint.y > botPoint.y) {
        console.log('below case')
        const tops = boxQuery.map(body => body.bounds.min.y)
        const topsBelow = tops.filter(y => y > botPoint.y + this.radius)
        console.log('topsBelow.length', topsBelow.length)
        farthestSidePoint.y = Math.min(...topsBelow, farthestSidePoint.y)
      } else {
        console.log('above case')
        const bottoms = boxQuery.map(body => body.bounds.max.y)
        const bottomsAbove = bottoms.filter(y => y < botPoint.y - this.radius)
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
      const offset = Math.sign(farthestSidePoint.y - botPoint.y) * this.radius
      box.center = { x: 0.5 * xMin + 0.5 * xMax, y: 0.5 * (botPoint.y + offset) + 0.5 * farthestSidePoint.y }
      box.width = (xMax - xMin)
      box.height = Math.abs(botPoint.y + offset - farthestSidePoint.y) * 0.9
      console.log('box', box)
      console.log('botPoint', botPoint)
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
    const minimumArea = this.radius * 2 * this.radius * 2
    console.log('area:', boxArea, 'minimum:', minimumArea)
    if (boxArea < minimumArea) {
      console.log('small box:', box)

      box.width = this.radius * 2
      box.height = this.radius * 2
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
      console.log('prey.moving test:', prey.moving)
      console.log('prey.blocked test:', prey.blocked)
      const struggling = prey.moving && prey.blocked
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
        const verts = this.boxToTriangle({ box, scale, sign: Math.sign(this.feature.body.position.x - box.center.x) })
        console.log('verts test:', verts)
        const absVerts = verts.map(vert => ({ x: vert.x + box.center.x, y: vert.y + box.center.y }))
        const center = Matter.Vertices.centre(absVerts)
        console.log('center test:', center)
        const v = this.stage.it?.feature.body.velocity ?? { x: 0, y: 0 }
        const even = Math.min(box.height, box.width) / Math.max(box.height, box.width)
        const maxSize = VISION_WIDTH * 0.5
        const size = Math.min(1, speed / 4) * Math.max(box.height, box.width)
        const m = even * Matter.Vector.magnitude(v)
        const z = (0.8 * m / 5 * size / maxSize) ** 3
        console.log('z test:', z)
        const velocity = this.stage.it?.feature.body.velocity ?? { x: 0, y: 0 }
        const direction = vectorToPoint(velocity)
        void new Puppet({
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
        const brickWidth = scaledWidth > this.radius * 2 ? scaledWidth : box.width
        const brickHeight = scaledHeight > this.radius * 2 ? scaledHeight : box.height
        /*
        const boxWidth = horizontal
          ? Math.sign(this.feature.body.position.x - box.center.x) * 0.5 * box.width * (1 - scale)
          : 0
        */
        // const boxHeight = !horizontal ? Math.sign(this.feature.body.position.y - box.center.y) * 0.5 * box.height * (1 - scale) : 0
        console.log('brickWidth', brickWidth)
        console.log('brickHeight', brickHeight)
        void new Brick({
          x: box.center.x,
          y: box.center.y,
          width: brickWidth,
          height: brickHeight,
          stage: this.stage
        })
      }
    } else {
      console.log('unclear test')
      this.stage.paused = true
    }
    this.blocked = false
    this.unblockTries = undefined
    this.setPath({ path: [], label: 'reset' })
    super.loseIt({ prey })
  }

  loseWay (props?: { goal?: Matter.Vector }): null {
    if (this.stage.debugLost) {
      const position = props?.goal ?? this.feature.body.position
      const point = vectorToPoint(position)
      this.stage.lostPoints.push(point)
      console.warn(`Lost ${this.stage.lostPoints.length}:`, this.feature.body.id, Math.floor(point.x), Math.floor(point.y))
      Player.players.forEach(player => {
        this.stage.line({
          color: 'yellow',
          end: point,
          start: player.feature.body.position
        })
      })
    }
    this.setPath({ path: [], label: 'lost' })
    return null
  }

  makeIt ({ predator }: { predator: Character }): void {
    super.makeIt({ predator })
    console.log('Bot.makeIt test')
    this.setPath({ path: [], label: 'reset' })
    this.blocked = false
  }

  setHeading ({ headings, label }: { headings: Heading[], label: string }): Heading {
    const earlyClearHeading = headings.reduce((headingA, headingB) => {
      if (headingA.time < headingB.time) return headingA
      return headingB
    })
    const earlyClearHeadings = headings.filter(heading => heading.time === earlyClearHeading.time)
    earlyClearHeadings[0].distance = this.getDistance(earlyClearHeadings[0].waypoint.position)
    const farHeading = earlyClearHeadings.reduce((headingA, headingB) => {
      headingB.distance = this.getDistance(headingB.waypoint.position)
      if (headingA.distance > headingB.distance) {
        return headingB
      }
      return headingA
    })
    this.headings[farHeading.waypoint.id].time = Date.now()
    this.setPath({ path: [farHeading.waypoint.position], label: 'explore' })

    return farHeading
  }

  setPath ({ path, label }: { path: Matter.Vector[], label: typeof Bot.pathLabels[number] }): void {
    this.path = path
    this.pathLabel = label
    this.pathTime = Date.now()
  }

  unblock (): Matter.Vector | null {
    const unblockPoint = this.getUnblockPoint()
    if (unblockPoint == null) {
      return this.loseWay()
    }
    this.setPath({ path: [unblockPoint], label: 'unblock' })
    return unblockPoint
  }

  takeInput (controls: Partial<Controls>): void {
    this.controls = { ...this.controls, ...controls }
  }
}
