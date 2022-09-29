import Matter from 'matter-js'
import Character from './Character'
import Controls, { STILL } from '../../shared/controls'
import Wall from './Wall'
import DebugLine from '../../shared/DebugLine'
import Waypoint from './Waypoint'
import DebugCircle from '../../shared/DebugCircle'
import { VISION_HEIGHT, VISION_WIDTH } from '../../shared/VISION'
import { getDistance, vectorToPoint } from '../lib/engine'
import Direction from './Direction'
import { getAngle, getAngleDifference, whichMax, whichMin } from '../lib/math'
import Player from './Player'
import { DEBUG } from '../lib/debug'
import raycast, { isPointClear, isPointOpen, isPointShown } from '../lib/raycast'
import Brick from './Brick'
import Feature from './Feature'
import Puppet from './Puppet'

export default class Bot extends Character {
  static botCount = 0
  static lostPoints: Matter.Vector[] = []
  static oldest: Bot
  static pathLabels = ['reset', 'unblock', 'pursue', 'flee', 'wander', 'explore', 'lost'] as const
  static TIME_LIMIT = 5000

  path: Matter.Vector[] = []
  pathTime?: number
  pathLabel?: typeof Bot.pathLabels[number]
  searchTimes: number[] = []
  unblockTries?: Record<number, boolean>
  constructor ({ color = 'green', radius = 15, x = 0, y = 0 }: {
    color?: string
    radius?: number
    x: number
    y: number
  }) {
    super({ x, y, color, radius })
    this.searchTimes = Waypoint.waypoints.map((waypoint) => -this.getDistance(waypoint.position))
    Bot.botCount = Bot.botCount + 1
    if (Bot.oldest == null) Bot.oldest = this
  }

  act (): void {
    if (DEBUG.BOT_CIRCLES) {
      const debugColor = Character.it === this
        ? 'red'
        : this.blocked && this.moving
          ? 'white'
          : this.blocked
            ? 'orange'
            : this.moving
              ? 'limegreen'
              : 'green'

      void new DebugCircle({
        x: this.feature.body.position.x,
        y: this.feature.body.position.y,
        radius: 7,
        color: debugColor
      })
    }
    const choice = this.chooseControls()
    this.takeInput(choice)
    super.act()
  }

  chooseControls (): Partial<Controls> {
    const direction = this.chooseDirection()
    if (direction == null) {
      return STILL
    }
    const controls = direction.getControls()

    return controls
  }

  chooseDirection (): Direction | null {
    if (Character.it == null) {
      return null
    }
    const isIt = Character.it === this
    const debug = isIt ? DEBUG.IT_CHOICE : DEBUG.NOT_IT_CHOICE
    const stuck = this.isStuck()
    const bored = this.path.length === 0
    const arriving = !bored && this.isPointClose({ point: this.path[0], limit: 15 })

    if (isIt) {
      const visibleCharacters: Character[] = []
      Character.characters.forEach(character => {
        const isVisible =
          character !== this &&
          character.ready &&
          this.isFeatureVisible(character.feature)
        if (isVisible) visibleCharacters.push(character)
      })
      if (visibleCharacters.length > 0) {
        const distances = visibleCharacters.map(character => this.getDistance(character.feature.body.position))
        const close = whichMin(visibleCharacters, distances)
        close.pursuer = this
        const point = vectorToPoint(close.feature.body.position)
        this.setPath({ path: [point], label: 'pursue' })
      }
    } else {
      const itVisible = this.isFeatureVisible(Character.it.feature)
      if (itVisible) {
        this.blocked = this.isBlocked()
        const trapped = this.blocked && (bored || stuck || arriving)
        if (trapped) {
          return this.unblock()
        }
        if (this.pathLabel !== 'unblock') {
          return this.flee()
        }
      } else {
        this.blocked = false
        this.unblockTries = undefined
      }
    }
    if (stuck || bored || arriving) {
      return this.explore()
    }
    return this.followPath(debug)
  }

  explore (debug = DEBUG.WANDER): Direction | null {
    const debugColor = debug ? 'tan' : undefined
    const openWaypointIds: number[] = []
    const otherCharacterBodies = Character.bodies.filter(body => body !== this.feature.body)
    const obstacles = [...Wall.wallObstacles, ...otherCharacterBodies]
    const openTimes = this.searchTimes.filter((time, index) => {
      const point = Waypoint.waypoints[index].position
      const inRange = this.isPointInRange(point)
      if (!inRange) return false
      // const isCharacterOpen = this.isPointCharacterOpen({ point })
      const isClear = isPointClear({
        debug,
        end: point,
        obstacles,
        start: this.feature.body.position
      })
      if (isClear) openWaypointIds.push(Waypoint.waypoints[index].id)
      return isClear
    })
    if (openTimes.length === 0) {
      return this.wander()
    }
    const earlyTime = Math.min(...openTimes)
    const earlyVisibleIds = openWaypointIds.filter(id => this.searchTimes[id] === earlyTime)
    const earlyDistances = earlyVisibleIds.map(id => this.getDistance(this.feature.body.position))
    const earlyFarId = whichMax(earlyVisibleIds, earlyDistances)
    const waypoint = Waypoint.waypoints[earlyFarId]

    this.searchTimes[waypoint.id] = Date.now()
    this.setPath({ path: [waypoint.position], label: 'explore' })
    return this.getDirection({ end: this.path[0], debugColor })
  }

  flee (): Direction | null {
    const debugColor = DEBUG.NOT_IT_CHOICE ? 'orange' : undefined
    if (Character.it == null) {
      throw new Error('Fleeing from no one')
    }
    this.setPath({ path: [], label: 'flee' })
    return Character.it.getDirection({ end: this.feature.body.position, debugColor })
  }

  followPath (debug?: boolean): Direction | null {
    const debugging = debug === true || DEBUG.PATHING
    if (debugging) {
      const originIndex = this.path.length - 1
      this.path.slice(0, originIndex).forEach((point, i) => {
        void new DebugLine({ start: point, end: this.path[i + 1], color: 'purple' })
      })
      void new DebugCircle({ x: this.path[0].x, y: this.path[0].y, radius: 5, color: 'purple' })
    }
    const target = this.path.find(point => this.isPointReachable({ point }))
    if (target == null) {
      const target = this.pathfind({ goal: this.path[0] })
      if (target == null) return this.loseWay()
      const debugColor = debugging ? 'red' : undefined
      return this.getDirection({ end: target, debugColor })
    } else {
      const debugColor = debug === true ? 'green' : undefined
      return this.getDirection({ end: target, debugColor })
    }
  }

  isBlocked (): boolean {
    if (Character.it == null) {
      return false
    }
    const vector = Matter.Vector.sub(this.feature.body.position, Character.it.feature.body.position)
    const direction = Matter.Vector.normalise(vector)
    const blockPoint = Matter.Vector.add(this.feature.body.position, Matter.Vector.mult(direction, 30))
    return !this.isPointWallOpen({ point: blockPoint, debug: DEBUG.CHASE })
  }

  getDistance (point: Matter.Vector): number {
    return getDistance(this.feature.body.position, point)
  }

  getUnblockPoint (): Matter.Vector | null {
    const eligible = Waypoint.waypoints.filter(waypoint => {
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
    if (Character.it == null || Character.it === this) {
      throw new Error('No it to unblock from')
    }
    const itAngle = getAngle(this.feature.body.position, Character.it.feature.body.position)
    const differences = far.map(waypoint => {
      const angle = getAngle(this.feature.body.position, waypoint.position)
      return getAngleDifference(angle, itAngle)
    })
    const mostDifferent = whichMax(far, differences)
    if (this.unblockTries == null) this.unblockTries = {}
    this.unblockTries[mostDifferent.id] = true
    return mostDifferent.position
  }

  getOpenCharacters (): Character[] {
    const characters = Character.characters.values()
    const visibleCharacters = []
    for (const character of characters) {
      const isVisible =
        character !== this &&
        character.ready &&
        this.isFeatureVisible(character.feature)
      if (isVisible) visibleCharacters.push(character)
    }
    return visibleCharacters
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
    return isPointShown({
      debug,
      end: point,
      obstacles: Wall.wallObstacles,
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
    void new DebugCircle({ x: botPoint.x, y: botPoint.y, radius: 15, color: 'red' })
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
    const obstacles = Feature.bodies.filter(body => body.id !== this.feature.body.id)
    const northHit = raycast({ start: botPoint, end: north, obstacles })
    const southHit = raycast({ start: botPoint, end: south, obstacles })
    const westHit = raycast({ start: botPoint, end: west, obstacles })
    const eastHit = raycast({ start: botPoint, end: east, obstacles })
    const sideEntryPoints = [northHit.entryPoint, eastHit.entryPoint, southHit.entryPoint, westHit.entryPoint]
    console.log('sideEntryPoints', sideEntryPoints)
    sideEntryPoints.forEach(point => new DebugCircle({ x: point.x, y: point.y, radius: 7, color: 'limegreen' }))
    const sideDistances = sideEntryPoints.map(point => getDistance(botPoint, point))
    const [northDistance, eastDistance, southDistance, westDistance] = sideDistances
    const maximum = Math.max(...sideDistances)
    const sideIndex = sideDistances.indexOf(maximum)
    const sideNorthWest = { x: botPoint.x - westDistance, y: botPoint.y - northDistance }
    const sideNorthEast = { x: botPoint.x + eastDistance, y: botPoint.y - northDistance }
    const sideSouthEast = { x: botPoint.x + eastDistance, y: botPoint.y + southDistance }
    const sideSouthWest = { x: botPoint.x - westDistance, y: botPoint.y + southDistance }
    void new DebugLine({ start: sideNorthWest, end: sideNorthEast, color: sideIndex === 0 ? 'white' : 'limegreen' })
    void new DebugLine({ start: sideNorthEast, end: sideSouthEast, color: sideIndex === 1 ? 'white' : 'limegreen' })
    void new DebugLine({ start: sideSouthEast, end: sideSouthWest, color: sideIndex === 2 ? 'white' : 'limegreen' })
    void new DebugLine({ start: sideSouthWest, end: sideNorthWest, color: sideIndex === 3 ? 'white' : 'limegreen' })
    const farthestSidePoint = sideEntryPoints[sideIndex]
    void new DebugCircle({ x: farthestSidePoint.x, y: farthestSidePoint.y, radius: 5, color: 'white' })
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
      corners.forEach(corner => new DebugCircle({ x: corner.x, y: corner.y, radius: 10, color: 'red' }))
      corners.forEach((corner, index, corners) => {
        void new DebugLine({ start: corners[index], end: corners[(index + 1) % corners.length], color: 'red' })
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
      boxQuery.forEach(body => new DebugCircle({ x: body.position.x, y: body.position.y, radius: 15, color: 'magenta' }))
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
      corners.forEach(corner => new DebugCircle({ x: corner.x, y: corner.y, radius: 10, color: 'red' }))
      corners.forEach((corner, index, corners) => {
        void new DebugLine({ start: corners[index], end: corners[(index + 1) % corners.length], color: 'red' })
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
      boxQuery.forEach(body => new DebugCircle({ x: body.position.x, y: body.position.y, radius: 15, color: 'magenta' }))
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
      // void new DebugCircle({ x: corner.x, y: corner.y, radius: 6, color: 'yellow' })
      void new DebugLine({ start: corners[index], end: corners[(index + 1) % corners.length], color: 'yellow' })
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
      void new DebugCircle({ x: box.center.x, y: box.center.y, radius: 6, color: 'white' })
      const halfWidth = 0.5 * box.width
      const halfHeight = 0.5 * box.height
      const northEastCorner = { x: box.center.x + halfWidth, y: box.center.y - halfHeight }
      const southWestCorner = { x: box.center.x - halfWidth, y: box.center.y + halfHeight }
      const southEastCorner = { x: box.center.x + halfWidth, y: box.center.y + halfHeight }
      const northWestCorner = { x: box.center.x - halfWidth, y: box.center.y - halfHeight }
      const corners = [northWestCorner, northEastCorner, southEastCorner, southWestCorner]
      corners.forEach((corner, index, corners) => {
        // void new DebugCircle({ x: corner.x, y: corner.y, radius: 6, color: 'yellow' })
        void new DebugLine({ start: corners[index], end: corners[(index + 1) % corners.length], color: 'aqua' })
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
        const v = Character.it?.feature.body.velocity ?? { x: 0, y: 0 }
        const even = Math.min(box.height, box.width) / Math.max(box.height, box.width)
        const maxSize = VISION_WIDTH * 0.5
        const size = Math.min(1, speed / 4) * Math.max(box.height, box.width)
        const m = even * Matter.Vector.magnitude(v)
        const z = (0.8 * m / 5 * size / maxSize) ** 3
        console.log('z test:', z)
        const velocity = Character.it?.feature.body.velocity ?? { x: 0, y: 0 }
        const direction = vectorToPoint(velocity)
        void new Puppet({
          x: center.x,
          y: center.y,
          direction,
          force: z,
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
          height: brickHeight
        })
      }
    } else {
      console.log('unclear test')
      // void new Brick({
      // x: this.feature.body.position.x,
      // y: this.feature.body.position.y,
      // height: this.radius * 2,
      // width: this.radius * 2
      // })
    }
    this.blocked = false
    this.unblockTries = undefined
    this.setPath({ path: [], label: 'reset' })
    super.loseIt({ prey })
  }

  setPath ({ path, label }: { path: Matter.Vector[], label: typeof Bot.pathLabels[number] }): void {
    this.path = path
    this.pathLabel = label
    this.pathTime = Date.now()
  }

  loseWay (props?: { goal?: Matter.Vector }): null {
    if (DEBUG.LOST) {
      const position = props?.goal ?? this.feature.body.position
      const point = vectorToPoint(position)
      Bot.lostPoints.push(point)
      console.warn(`Lost ${Bot.lostPoints.length}:`, this.feature.body.id, Math.floor(point.x), Math.floor(point.y))
      Player.players.forEach(player => {
        void new DebugLine({ start: player.feature.body.position, end: point, color: 'yellow' })
      })
    }
    this.setPath({ path: [], label: 'lost' })
    return null
  }

  makeIt ({ predator }: { predator: Character }): void {
    super.makeIt({ predator })
    console.log('Bot.makeIt test')
    // if (struggling || Character.it == null) {

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
    this.setPath({ path: [], label: 'reset' })
    this.blocked = false
  }

  pathfind ({ goal }: {
    goal: Matter.Vector
  }): Matter.Vector | null {
    const goalPoint = vectorToPoint(goal)
    if (this.isPointReachable({ point: goalPoint })) {
      this.path = [goalPoint]

      return goalPoint
    }
    const visibleFromStart = Waypoint.waypoints.filter(waypoint => {
      return this.isPointReachable({ point: waypoint.position })
    })
    if (visibleFromStart.length === 0) {
      if (DEBUG.LOST) {
        console.warn('Invisible path start')
      }
      return this.loseWay()
    }

    const visibleFromEnd = Waypoint.waypoints.filter(waypoint => {
      return isPointOpen({
        start: waypoint.position,
        end: goalPoint,
        radius: this.radius,
        obstacles: Wall.wallObstacles
      })
      // return Wall.isPointOpen({ start: waypoint.position, end: goalPoint, radius: this.radius })
    })
    if (visibleFromEnd.length === 0) {
      if (DEBUG.LOST) {
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

  unblock (): Direction | null {
    const unblockPoint = this.getUnblockPoint()
    if (unblockPoint == null) {
      return this.loseWay()
    }
    this.setPath({ path: [unblockPoint], label: 'unblock' })
    const debugColor = DEBUG.NOT_IT_CHOICE ? 'limegreen' : undefined
    return this.getDirection({ end: this.path[0], debugColor })
  }

  wander (debug = DEBUG.WANDER): Direction | null {
    const debugColor = debug ? 'tan' : undefined
    const visibleWaypointIds: number[] = []
    const visibleTimes = this.searchTimes.filter((time, index) => {
      const isVisible = this.isPointWallVisible({ point: Waypoint.waypoints[index].position })
      if (isVisible) visibleWaypointIds.push(Waypoint.waypoints[index].id)
      return isVisible
    })

    if (visibleTimes.length === 0) {
      return this.loseWay()
    }
    const earlyTime = Math.min(...visibleTimes)
    const earlyVisibleIds = visibleWaypointIds.filter(id => this.searchTimes[id] === earlyTime)
    const earlyDistances = earlyVisibleIds.map(id => this.getDistance(this.feature.body.position))
    const earlyFarId = whichMax(earlyVisibleIds, earlyDistances)
    const waypoint = Waypoint.waypoints[earlyFarId]
    if (waypoint == null) {
      return null
    }

    this.searchTimes[waypoint.id] = Date.now()
    this.setPath({ path: [waypoint.position], label: 'wander' })
    return this.getDirection({ end: this.path[0], debugColor })
  }

  takeInput (controls: Partial<Controls>): void {
    this.controls = { ...this.controls, ...controls }
  }
}
