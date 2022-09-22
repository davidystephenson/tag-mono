import Matter from 'matter-js'
import Character from './Character'
import Controls, { STILL } from '../../shared/controls'
import Wall from './Wall'
import DebugLine from '../../shared/DebugLine'
import Waypoint from './Waypoint'
import DebugCircle from '../../shared/DebugCircle'
import VISION, { VISION_HEIGHT, VISION_WIDTH } from '../../shared/VISION'
import { getDistance, vectorToPoint } from '../lib/engine'
import Direction from './Direction'
import { getAngle, getAngleDifference, whichMax, whichMin } from '../lib/math'
import Player from './Player'
import { DEBUG } from '../lib/debug'
import raycast from '../lib/raycast'
import Brick from './Brick'
import Feature from './Feature'
import Puppet from './Puppet'
import Actor from './Actor'
import { isPointInVisionRange } from '../lib/inRange'

export default class Bot extends Character {
  static botCount = 0
  static lostPoints: Matter.Vector[] = []
  static pathLabels = ['reset', 'unblock', 'pursue', 'flee', 'wander', 'explore']
  static oldest: Bot
  static TIME_LIMIT = 5000
  searchTimes: number[] = []
  path: Matter.Vector[] = []
  pathTime?: number
  pathLabel?: typeof Bot.pathLabels[number]
  unblockTries?: Record<number, boolean>

  constructor ({ x = 0, y = 0, radius = 15, color = 'green' }: {
    x: number
    y: number
    color?: string
    radius?: number
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
        : this.blocked
          ? 'white'
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
        const confused = bored || stuck || arriving
        const trapped = this.blocked && confused
        if (trapped) {
          return this.unblock()
        }
        if (this.pathLabel !== 'unblock') {
          return this.flee()
        }
      } else {
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
    const openTimes = this.searchTimes.filter((time, index) => {
      const point = Waypoint.waypoints[index].position
      const inRange = this.isPointInRange(point)
      if (!inRange) return false
      const isCharacterOpen = this.isPointCharacterOpen({ point })
      if (isCharacterOpen) openWaypointIds.push(Waypoint.waypoints[index].id)
      return isCharacterOpen
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

  isCircleWallShown ({
    point,
    radius = this.radius,
    debug
  }: {
    point: Matter.Vector
    radius?: number
    debug?: boolean
  }): boolean {
    return Wall.isCircleShown({
      start: this.feature.body.position,
      end: point,
      startRadius: this.radius,
      endRadius: radius,
      debug
    })
  }

  isCircleWallVisible ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    const inRange = this.isPointInRange(point)
    if (!inRange) return false
    const clear = this.isCircleWallShown({ point, debug })
    return clear
  }

  isPointClose ({ point, limit = 45 }: { point: Matter.Vector, limit?: number }): boolean {
    const distance = this.getDistance(point)
    const close = distance < limit
    return close
  }

  isPointOpen ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    return Feature.isPointOpen({ start: this.feature.body.position, end: point, radius: this.radius, body: this.feature.body, debug })
  }

  isPointReachable ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    const inRange = this.isPointInRange(point)
    if (!inRange) return false
    const clear = this.isPointWallOpen({ point, debug })
    return clear
  }

  isPointWallClear ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    return Wall.isPointClear({ start: this.feature.body.position, end: point, debug })
  }

  isPointWallOpen ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    return Wall.isPointOpen({ start: this.feature.body.position, end: point, radius: this.radius, debug })
  }

  isPointWallShown ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    return Wall.isPointShown({ start: this.feature.body.position, radius: this.radius, end: point, debug })
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
    const halfHeight = Math.max(this.radius, 0.5 * scale * box.height)
    const halfWidth = Math.max(this.radius, 0.5 * scale * box.width)
    const sideX = sign * 2 * halfWidth
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
    void new DebugCircle({ x: botPoint.x, y: botPoint.y, radius: 15, color: 'teal' })
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
    const northEastHit = raycast({ start: botPoint, end: northEast, obstacles })
    const southEastHit = raycast({ start: botPoint, end: southEast, obstacles })
    const southWestHit = raycast({ start: botPoint, end: southWest, obstacles })
    const northWestHit = raycast({ start: botPoint, end: northWest, obstacles })
    const northHit = raycast({ start: botPoint, end: north, obstacles })
    const southHit = raycast({ start: botPoint, end: south, obstacles })
    const westHit = raycast({ start: botPoint, end: west, obstacles })
    const eastHit = raycast({ start: botPoint, end: east, obstacles })
    const cornerEntryPoints = [northEastHit.entryPoint, southEastHit.entryPoint, southWestHit.entryPoint, northWestHit.entryPoint]
    const sideEntryPoints = [northHit.entryPoint, southHit.entryPoint, westHit.entryPoint, eastHit.entryPoint]
    console.log('sideEntryPoints', sideEntryPoints)
    cornerEntryPoints.forEach(entryPoint => {
      // void new DebugCircle({ x: entryPoint.x, y: entryPoint.y, radius: 10, color: 'green' })
    })
    sideEntryPoints.forEach(entryPoint => {
      // void new DebugCircle({ x: entryPoint.x, y: entryPoint.y, radius: 10, color: 'aqua' })
    })
    const sideDistances = sideEntryPoints.map(point => getDistance(botPoint, point))
    const maximum = Math.max(...sideDistances)
    const sideIndex = sideDistances.indexOf(maximum)
    const farthestSidePoint = sideEntryPoints[sideIndex]
    sideEntryPoints.forEach(point => new DebugCircle({ x: point.x, y: point.y, radius: 10, color: 'limegreen' }))
    void new DebugCircle({ x: farthestSidePoint.x, y: farthestSidePoint.y, radius: 5, color: 'black' })
    const horizontal = [2, 3].includes(sideIndex)
    const box = { center: botPoint, height: 2 * this.radius, width: 2 * this.radius }
    // const visibleFeatures = this.getClearFeatures()
    const visibleBodies = Feature.bodies // visibleFeatures.map(feature => feature.body)
    if (horizontal) {
      console.log('horizontal case')
      const corners = []
      if (farthestSidePoint.x > botPoint.x) {
        console.log('right side')
        console.log('farthestSidePoint', farthestSidePoint)
        const botNorth = { x: botPoint.x + this.radius, y: northY }
        const botSouth = { x: botPoint.x + this.radius, y: southY }
        corners.push(...[botNorth, botSouth, northEast, southEast])
      }
      if (farthestSidePoint.x < botPoint.x) {
        console.log('left side')
        const botNorth = { x: botPoint.x - this.radius, y: northY }
        const botSouth = { x: botPoint.x - this.radius, y: southY }
        corners.push(...[botNorth, botSouth, northWest, southWest])
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
        return points.some(point => Feature.isPointX({
          start: this.feature.body.position,
          end: point,
          radius: this.radius,
          body: this.feature.body
        }))
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
        corners.push(...[botEast, botWest, southEast, southWest])
      }
      if (farthestSidePoint.y < botPoint.y) {
        console.log('far point above')
        const botEast = { x: eastX, y: botPoint.y - this.radius }
        const botWest = { x: westX, y: botPoint.y - this.radius }
        corners.push(...[botEast, botWest, northEast, northWest])
      }
      corners.forEach(corner => new DebugCircle({ x: corner.x, y: corner.y, radius: 10, color: 'red' }))
      const queryBounds = Matter.Bounds.create(corners)
      const boxQuery0 = Matter.Query.region(visibleBodies, queryBounds)
      const boxQuery = boxQuery0.filter(body => {
        const points = [...body.vertices, body.position]
        const noPointInRange = points.every(point => !this.isPointInRange(point))
        if (noPointInRange) return true
        return points.some(point => Feature.isPointX({
          start: this.feature.body.position,
          end: point,
          radius: this.radius,
          body: this.feature.body
        }))
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
      box.width = (xMax - xMin) * 0.9
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
    const queryBounds = Matter.Bounds.create(corners)

    const boxQuery = Matter.Query.region(Feature.bodies, queryBounds)
    boxQuery.forEach(body => {
      console.log(body.label, body.position)
      void new DebugCircle({ x: body.position.x, y: body.position.y, radius: 13, color: 'orange' })
    })
    const isBoxClear = boxQuery.length === 0
    if (isBoxClear) {
      console.log('prey.moving test:', prey.moving)
      console.log('prey.blocked test:', prey.blocked)
      const struggling = prey.moving && prey.blocked
      console.log('struggling test:', struggling)
      void new DebugCircle({ x: box.center.x, y: box.center.y, radius: 6, color: 'white' })
      if (struggling) {
        const speed = Matter.Vector.magnitude(this.feature.body.velocity)
        const scale = 1 // Math.min(1, speed / 4)
        console.log('horizontal', horizontal)
        const boxWidth = horizontal ? Math.sign(this.feature.body.position.x - box.center.x) * 0.5 * box.width * (1 - scale) : 0
        const boxHeight = !horizontal ? Math.sign(this.feature.body.position.y - box.center.y) * 0.5 * box.height * (1 - scale) : 0
        console.log('boxHeight', boxHeight)
        console.log('boxWidth', boxWidth)
        const verts = this.boxToTriangle({ box, scale, sign: Math.sign(this.feature.body.position.x - box.center.x) })
        const absVerts = verts.map(vert => ({ x: vert.x + box.center.x, y: vert.y + box.center.y }))
        const center = Matter.Vertices.centre(absVerts)
        const v = Character.it?.feature.body.velocity ?? { x: 0, y: 0 }
        const even = Math.min(box.height, box.width) / Math.max(box.height, box.width)
        const maxSize = VISION_WIDTH * 0.5
        const size = Math.min(1, speed / 4) * Math.max(box.height, box.width)
        const m = even * Matter.Vector.magnitude(v)
        const z = 0.02 * m / 5 * size / maxSize
        console.log('z test:', z)
        const velocity = Character.it?.feature.body.velocity ?? { x: 0, y: 0 }
        const direction = vectorToPoint(velocity)
        void new Puppet({
          x: center.x + boxWidth,
          y: center.y + boxHeight,
          direction,
          force: Math.min(z, 0.02),
          vertices: verts
        })
      } else {
        const speed = Matter.Vector.magnitude(this.feature.body.velocity)
        const scale = 0.5 // Math.min(1, speed / 4)
        const boxWidth = horizontal ? Math.sign(this.feature.body.position.x - box.center.x) * 0.5 * box.width * (1 - scale) : 0
        const boxHeight = !horizontal ? Math.sign(this.feature.body.position.y - box.center.y) * 0.5 * box.height * (1 - scale) : 0
        console.log('boxWidth', boxWidth)
        console.log('boxHeight', boxHeight)
        void new Brick({
          x: box.center.x + boxWidth,
          y: box.center.y + boxHeight,
          width: Math.max(2 * this.radius, box.width * scale),
          height: Math.max(2 * this.radius, box.height * scale)
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
      // Actor.paused = true
    }
    super.loseIt({ prey })
    this.setPath({ path: [], label: 'reset' })
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
      return Wall.isPointOpen({ start: waypoint.position, end: goalPoint, radius: this.radius })
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
