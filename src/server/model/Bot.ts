import Matter from 'matter-js'
import Character from './Character'
import Controls, { STILL } from '../../shared/controls'
import Wall from './Wall'
import DebugLine from '../../shared/DebugLine'
import Waypoint from './Waypoint'
import DebugCircle from '../../shared/DebugCircle'
import VISION, { } from '../../shared/VISION'
import { getDistance, vectorToPoint } from '../lib/engine'
import Direction from './Direction'
import { getAngle, getAngleDifference, whichMax, whichMin } from '../lib/math'
import Player from './Player'
import { DEBUG } from '../lib/debug'

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
  alertTime?: number

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
        radius: 5,
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
      if (visibleCharacters.length > 0) {
        const distances = visibleCharacters.map(character => this.getDistance(character.feature.body.position))
        const close = whichMin(visibleCharacters, distances)
        close.pursuer = this
        const point = vectorToPoint(close.feature.body.position)
        this.setPath({ path: [point] })
        const debugColor = DEBUG.IT_CHOICE || DEBUG.CHASE ? 'yellow' : undefined
        return this.getDirection({ end: point, velocity: close.feature.body.velocity, debugColor })
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
    this.setPath()
    const debugColor = DEBUG.NOT_IT_CHOICE ? 'orange' : undefined
    if (Character.it == null) {
      throw new Error('Fleeing from no one')
    }
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

  makeIt (): void {
    super.makeIt()
    // const struggling = this.moving && this.blocked
    // const northY = this.feature.body.position.y - VISION_HEIGHT
    // const southY = this.feature.body.position.y + VISION_HEIGHT
    // const westX = this.feature.body.position.x - VISION_WIDTH
    // const eastX = this.feature.body.position.x + VISION_WIDTH
    // const northEast = { x: eastX, y: northY }
    // const southEast = { x: eastX, y: southY }
    // const southWest = { x: westX, y: southY }
    // const northWest = { x: westX, y: northY }
    // const northEastHit = raycast({ start: this.feature.body.position, end: northEast, obstacles: Feature.obstacles })
    // const southEastHit = raycast({ start: this.feature.body.position, end: southEast, obstacles: Feature.obstacles })
    // const southWestHit = raycast({ start: this.feature.body.position, end: southWest, obstacles: Feature.obstacles })
    // const northWestHit = raycast({ start: this.feature.body.position, end: northWest, obstacles: Feature.obstacles })
    // const entryPoints = [northEastHit.entryPoint, southEastHit.entryPoint, southWestHit.entryPoint, northWestHit.entryPoint]
    // const northEastDistance = this.getDistance(northEastHit.entryPoint)
    // const southWestDistance = this.getDistance(southWestHit.entryPoint)
    // const southEastDistance = this.getDistance(southEastHit.entryPoint)
    // const northWestDistance = this.getDistance(northWestHit.entryPoint)
    // const entryPointsDistances = [northEastDistance, southEastDistance, southWestDistance, northWestDistance]
    // const farthestEntryPoint = whichMax(entryPoints, entryPointsDistances)
    // const minimumDistance = Math.min(...entryPointsDistances)
    // const halfMinimum = minimumDistance / 2
    // const maximumDistance = 700 // Math.max(...entryPointsDistances)
    // const halfMaximum = maximumDistance / 2
    // const boxCenter = {
    //   x: (this.feature.body.position.x + farthestEntryPoint.x) / 2,
    //   y: (this.feature.body.position.y + farthestEntryPoint.y) / 2
    // }
    // const northEastCorner = { x: boxCenter.x + halfMaximum, y: boxCenter.y - halfMaximum }
    // const southWestCorner = { x: boxCenter.x - halfMaximum, y: boxCenter.y + halfMaximum }
    // const southEastCorner = { x: boxCenter.x + halfMaximum, y: boxCenter.y + halfMaximum }
    // const northWestCorner = { x: boxCenter.x - halfMaximum, y: boxCenter.y - halfMaximum }
    // const corners = [northWestCorner, northEastCorner, southEastCorner, southWestCorner]
    // const refBounds = refWall.body.bounds
    // console.log('refBounds', refBounds)
    // // const northClear = isPointClear({ start: northWestCorner, end: northEastCorner, obstacles: Feature.obstacles })
    // // const southClear = isPointClear({ start: southWestCorner, end: southEastCorner, obstacles: Feature.obstacles })
    // // const westClear = isPointClear({ start: northWestCorner, end: southWestCorner, obstacles: Feature.obstacles })
    // // const eastClear = isPointClear({ start: northEastCorner, end: southEastCorner, obstacles: Feature.obstacles })
    // // const forwardClear = isPointClear({ start: southWestCorner, end: northEastCorner, obstacles: Feature.obstacles })
    // // const backwardClear = isPointClear({ start: northWestCorner, end: southEastCorner, obstacles: Feature.obstacles })
    // const queryBounds = Matter.Bounds.create(corners)
    // console.log('queryBounds', queryBounds)
    // const refOverlaps = Matter.Bounds.overlaps(queryBounds, refBounds)
    // console.log('refOverlaps', refOverlaps)
    // const boxQuery = Matter.Query.region(Feature.obstacles, queryBounds)
    // console.log('boxQuery', boxQuery)
    // console.log('Feature.obstacles.length', Feature.obstacles.length)
    // const isBoxClear = boxQuery.length === 0
    // if (isBoxClear) {
    //   console.log('clear test')
    //   void new Brick({
    //     x: boxCenter.x,
    //     y: boxCenter.y,
    //     width: maximumDistance,
    //     height: maximumDistance
    //   })
    // } else {
    //   console.log('unclear test')
    //   void new Brick({
    //     x: this.feature.body.position.x,
    //     y: this.feature.body.position.y,
    //     height: this.radius * 2,
    //     width: this.radius * 2
    //   })
    // }
    // Actor.paused = true
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
        console.log('Invisible path start')
      }
      return this.loseWay()
    }

    const visibleFromEnd = Waypoint.waypoints.filter(waypoint => {
      return Wall.isPointOpen({ start: waypoint.position, end: goalPoint, radius: this.radius })
    })
    if (visibleFromEnd.length === 0) {
      if (DEBUG.LOST) {
        console.log('Invisible path goal')
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

  unblock (): Direction {
    const unblockPoint = this.getUnblockPoint()
    if (unblockPoint == null) {
      return this.flee()
    }
    this.unblocking = true
    this.setPath({ path: [unblockPoint] })
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
