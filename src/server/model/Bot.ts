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
import Actor from './Actor'
import Brick from './Brick'
import Feature from './Feature'
import Puppet from './Puppet'

export default class Bot extends Character {
  static oldest: Bot
  static TIME_LIMIT = 5000
  static lostPoints: Matter.Vector[] = []
  static botCount = 0
  searchTimes: number[] = []
  path: Matter.Vector[] = []
  pathTime?: number
  unblockTries?: Record<number, boolean>
  unblocking = false
  chaseTime?: number
  chaseCharacters?: Record<number, boolean>

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
      const debugColor = Character.it === this ? 'red' : 'white'
      void new DebugCircle({
        x: this.feature.body.position.x,
        y: this.feature.body.position.y,
        radius: 10,
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
    const itVisible = !isIt && this.isFeatureVisible(Character.it.feature)
    if (!itVisible) this.unblockTries = undefined
    this.blocked = itVisible && this.isBlocked()
    const debug = isIt ? DEBUG.IT_CHOICE : DEBUG.NOT_IT_CHOICE
    if (isIt) {
      const visibleCharacters = this.getVisibleCharacters()
      const eligibleCharacters = visibleCharacters.filter(character => {
        return this.chaseCharacters?.[character.feature.body.id] !== true
      })
      if (eligibleCharacters.length > 0) {
        const distances = eligibleCharacters.map(character => this.getDistance(character.feature.body.position))
        const close = whichMin(eligibleCharacters, distances)
        if (this.chaseTime == null) this.chaseTime = Date.now()
        else {
          const difference = Date.now() - this.chaseTime
          if (difference > Bot.TIME_LIMIT) {
            if (this.chaseCharacters == null) this.chaseCharacters = {}
            this.chaseCharacters[close.feature.body.id] = true
            console.log('give up on', close.feature.body.id)
            return null
          }
        }
        close.pursuer = this
        const point = vectorToPoint(close.feature.body.position)
        this.setPath({ path: [point] })
        const debugColor = DEBUG.IT_CHOICE || DEBUG.CHASE ? 'yellow' : undefined
        return this.getDirection({ end: point, velocity: close.feature.body.velocity, debugColor })
      } else {
        this.chaseCharacters = undefined
      }
    }
    if ((itVisible && !this.unblocking) || this.isBored()) {
      if (this.blocked) {
        return this.unblock()
      } else if (itVisible) {
        return this.flee()
      } else {
        return this.wander()
      }
    }
    return this.followPath(debug)
  }

  followPath (debug?: boolean): Direction | null {
    const debugging = debug === true || DEBUG.PATHING
    if (debugging) {
      const originIndex = this.path.length - 1
      this.path.slice(0, originIndex).forEach((point, i) => {
        void new DebugLine({ start: point, end: this.path[i + 1], color: 'purple' })
      })
      void new DebugCircle({ x: this.path[0].x, y: this.path[0].y, radius: 10, color: 'purple' })
    }
    const target = this.getTarget({ path: this.path })
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

  flee (): Direction {
    const chaseTime = this.chaseTime ?? Date.now()
    const difference = Date.now() - chaseTime
    if (difference > Bot.TIME_LIMIT) {
      this.unblock()
    }
    const debugColor = DEBUG.NOT_IT_CHOICE ? 'orange' : undefined
    if (Character.it == null) {
      throw new Error('Fleeing from no one')
    }
    this.setPath()
    this.chaseTime = chaseTime
    return Character.it.getDirection({ end: this.feature.body.position, debugColor })
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

  getTarget ({ path }: { path: Matter.Vector[] }): Matter.Vector | undefined {
    return path.find(point => this.isPointReachable({ point }))
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

  getWanderWaypoint (): Waypoint | null {
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
    const earlyFarWaypoint = Waypoint.waypoints[earlyFarId]
    return earlyFarWaypoint
  }

  getVisibleCharacters (): Character[] {
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

  isBored (): boolean {
    if (this.path.length === 0) return true
    if (this.isPointClose({ point: this.path[0], limit: 15 })) return true
    if (this.isStuck()) return true
    return false
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

  isPointReachable ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    const inRange = this.isPointInRange(point)
    if (!inRange) return false
    const clear = this.isPointWallOpen({ point, debug })
    return clear
  }

  isPointInRange (point: Matter.Vector): boolean {
    const start = this.feature.body.position
    const inRangeX = start.x - VISION.width < point.x && point.x < start.x + VISION.width
    if (!inRangeX) return false
    const inRangeY = start.y - VISION.height < point.y && point.y < start.y + VISION.height
    return inRangeY
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

  loseIt (): void {
    super.loseIt()
    this.setPath()
  }

  setPath (props?: { path?: Matter.Vector[] }): void {
    this.path = props?.path ?? []
    this.pathTime = props?.path == null ? undefined : Date.now()
    this.unblocking = false
    this.chaseTime = undefined
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

  boxToTriangle (box: {
    center: Matter.Vector
    width: number
    height: number
  }): Matter.Vector[] {
    const speed = Matter.Vector.magnitude(this.feature.body.velocity)
    const scale = Math.min(1, speed / 4)
    const halfHeight = Math.max(this.radius, 0.5 * scale * box.height)
    const halfWidth = Math.max(this.radius, 0.5 * scale * box.width)
    const left = { x: -halfWidth, y: halfHeight }
    const right = { x: halfWidth, y: halfHeight }
    const itPosition = Character.it == null ? { x: 0, y: 0 } : Character.it?.feature.body.position
    const angle = Matter.Vector.angle(this.feature.body.position, itPosition)
    const weight = angle / Math.PI
    const top = { x: weight * halfWidth, y: -halfHeight }
    return [left, right, top]
  }

  makeIt (): void {
    const botPoint = vectorToPoint(this.feature.body.position)
    void new DebugCircle({ x: botPoint.x, y: botPoint.y, radius: 16, color: 'teal' })
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
    const northEastHit = raycast({ start: botPoint, end: northEast, obstacles: Feature.obstacles })
    const southEastHit = raycast({ start: botPoint, end: southEast, obstacles: Feature.obstacles })
    const southWestHit = raycast({ start: botPoint, end: southWest, obstacles: Feature.obstacles })
    const northWestHit = raycast({ start: botPoint, end: northWest, obstacles: Feature.obstacles })
    const northHit = raycast({ start: botPoint, end: north, obstacles: Feature.obstacles })
    const southHit = raycast({ start: botPoint, end: south, obstacles: Feature.obstacles })
    const westHit = raycast({ start: botPoint, end: west, obstacles: Feature.obstacles })
    const eastHit = raycast({ start: botPoint, end: east, obstacles: Feature.obstacles })
    const cornerEntryPoints = [northEastHit.entryPoint, southEastHit.entryPoint, southWestHit.entryPoint, northWestHit.entryPoint]
    const sideEntryPoints = [northHit.entryPoint, southHit.entryPoint, westHit.entryPoint, eastHit.entryPoint]
    console.log('sideEntryPoints', sideEntryPoints)
    cornerEntryPoints.forEach(entryPoint => {
      void new DebugCircle({ x: entryPoint.x, y: entryPoint.y, radius: 10, color: 'green' })
    })
    sideEntryPoints.forEach(entryPoint => {
      void new DebugCircle({ x: entryPoint.x, y: entryPoint.y, radius: 10, color: 'aqua' })
    })
    const sideDistances = sideEntryPoints.map(point => getDistance(botPoint, point))
    const maximum = Math.max(...sideDistances)
    const sideIndex = sideDistances.indexOf(maximum)
    const farthestSidePoint = sideEntryPoints[sideIndex]
    const horizontal = [2, 3].includes(sideIndex)
    const box = { center: botPoint, height: 2 * this.radius, width: 2 * this.radius }
    if (horizontal) {
      const corners = []
      if (farthestSidePoint.x > botPoint.x) {
        const botNorth = { x: botPoint.x + this.radius * 1.01, y: northY }
        const botSouth = { x: botPoint.x + this.radius * 1.01, y: southY }
        corners.push(...[botNorth, botSouth, northEast, southEast])
      }
      if (farthestSidePoint.x < botPoint.x) {
        const botNorth = { x: botPoint.x - this.radius * 1.01, y: northY }
        const botSouth = { x: botPoint.x - this.radius * 1.01, y: southY }
        corners.push(...[botNorth, botSouth, northWest, southWest])
      }
      const queryBounds = Matter.Bounds.create(corners)
      const boxQuery = Matter.Query.region(Feature.obstacles, queryBounds)
      const bottoms = boxQuery.map(body => body.bounds.max.y)
      const tops = boxQuery.map(body => body.bounds.min.y)
      const bottomsAbove = bottoms.filter(y => y < botPoint.y)
      const topsBelow = tops.filter(y => y > botPoint.y)
      const yMin = Math.max(...bottomsAbove, northY)
      const yMax = Math.min(...topsBelow, southY)
      box.center = { x: 0.5 * botPoint.x + 0.5 * farthestSidePoint.x, y: 0.5 * yMin + 0.5 * yMax }
      box.height = (yMax - yMin) * 0.99
      box.width = Math.abs(botPoint.x - farthestSidePoint.x) * 0.99
    } else {
      console.log('vertical case')
      const corners = []
      if (farthestSidePoint.y > botPoint.y) {
        console.log('far point below')
        const botEast = { x: eastX, y: botPoint.y + this.radius * 1.01 }
        const botWest = { x: westX, y: botPoint.y + this.radius * 1.01 }
        corners.push(...[botEast, botWest, southEast, southWest])
      }
      if (farthestSidePoint.y < botPoint.y) {
        console.log('far point above')
        const botEast = { x: eastX, y: botPoint.y - this.radius * 1.01 }
        const botWest = { x: westX, y: botPoint.y - this.radius * 1.01 }
        corners.push(...[botEast, botWest, southEast, southWest])
      }
      corners.forEach(corner => new DebugCircle({ x: corner.x, y: corner.y, radius: 10, color: 'red' }))
      const queryBounds = Matter.Bounds.create(corners)
      const boxQuery = Matter.Query.region(Feature.obstacles, queryBounds)
      const rights = boxQuery.map(body => body.bounds.max.x)
      const lefts = boxQuery.map(body => body.bounds.min.x)
      const rightsWest = rights.filter(x => x < botPoint.x)
      const leftsEast = lefts.filter(x => x > botPoint.x)
      const xMin = Math.max(...rightsWest, westX)
      const xMax = Math.min(...leftsEast, eastX)
      box.center = { x: 0.5 * xMin + 0.5 * xMax, y: 0.5 * botPoint.y + 0.5 * farthestSidePoint.y }
      box.width = (xMax - xMin) * 0.99
      box.height = Math.abs(botPoint.y - farthestSidePoint.y) * 0.99
    }
    const halfWidth = 0.5 * box.width
    const halfHeight = 0.5 * box.height
    const northEastCorner = { x: box.center.x + halfWidth, y: box.center.y - halfHeight }
    const southWestCorner = { x: box.center.x - halfWidth, y: box.center.y + halfHeight }
    const southEastCorner = { x: box.center.x + halfWidth, y: box.center.y + halfHeight }
    const northWestCorner = { x: box.center.x - halfWidth, y: box.center.y - halfHeight }
    const corners = [northWestCorner, northEastCorner, southEastCorner, southWestCorner]
    corners.forEach(entryPoint => {
      void new DebugCircle({ x: entryPoint.x, y: entryPoint.y, radius: 6, color: 'yellow' })
    })
    const queryBounds = Matter.Bounds.create(corners)
    const boxQuery = Matter.Query.region(Feature.obstacles, queryBounds)
    boxQuery.forEach(body => console.log(body.label, body.position))
    const isBoxClear = boxQuery.length === 0
    if (isBoxClear) {
      void new DebugCircle({
        x: box.center.x,
        y: box.center.y,
        radius: 15,
        color: 'white'
      })
      const struggling = this.moving && this.blocked
      if (!struggling) {
        const speed = Matter.Vector.magnitude(this.feature.body.velocity)
        const scale = 0.5 // Math.min(1, speed / 4)
        const boxWidth = Math.sign(this.feature.body.position.x - box.center.x) * 0.5 * box.width * scale
        void new Brick({
          x: box.center.x + boxWidth,
          y: box.center.y,
          width: Math.max(2 * this.radius, box.width * scale),
          height: Math.max(2 * this.radius, box.height * scale)
        })
      } else {
        const verts = this.boxToTriangle(box)
        const v = Character.it?.feature.body.velocity ?? { x: 0, y: 0 }
        const even = Math.min(box.height, box.width) / Math.max(box.height, box.width)
        const speed = Matter.Vector.magnitude(this.feature.body.velocity)
        const maxSize = VISION_WIDTH * 0.5
        const size = Math.min(1, speed / 4) * Math.max(box.height, box.width)
        const m = even * Matter.Vector.magnitude(v)
        const z = 0.02 * m / 5 * size / maxSize
        console.log('z test:', z)
        void new Puppet({
          x: box.center.x,
          y: box.center.y,
          direction: Character.it?.feature.body.velocity,
          force: Math.min(z, 0.02),
          vertices: verts
        })
      }
    } else {
      // throw new Error('not clear')
      console.log('unclear test')
      void new Brick({
        x: this.feature.body.position.x,
        y: this.feature.body.position.y,
        height: this.radius * 2,
        width: this.radius * 2
      })
    }
    Actor.paused = true
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
    this.setPath()
    this.blocked = false
    super.makeIt()
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
    this.setPath({ path: [unblockPoint] })
    this.unblocking = true
    const debugColor = DEBUG.NOT_IT_CHOICE ? 'black' : undefined
    return this.getDirection({ end: this.path[0], debugColor })
  }

  wander (debug = DEBUG.WANDER): Direction | null {
    const debugColor = debug ? 'tan' : undefined
    const waypoint = this.getWanderWaypoint()
    if (waypoint == null) {
      return null
    }

    this.searchTimes[waypoint.id] = Date.now()
    this.setPath({ path: [waypoint.position] })
    return this.getDirection({ end: this.path[0], debugColor })
  }

  takeInput (controls: Partial<Controls>): void {
    this.controls = { ...this.controls, ...controls }
  }
}
