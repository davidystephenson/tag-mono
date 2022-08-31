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
import { getAnglePercentage, getAnglePercentageDifference, whichMax, whichMin } from '../lib/math'
import Player from './Player'

export default class Bot extends Character {
  static oldest: Bot
  static DEBUG_CHASE = true
  static DEBUG_PATHING = false
  static DEBUG_IT_CHOICE = false
  static DEBUG_NOT_IT_CHOICE = false
  static DEBUG_WANDER = false
  static DEBUG_LOST = true
  static WANDER_TIME = 5000
  static lostPoints: Matter.Vector[] = []
  static botCount = 0
  searchTimes: number[] = []
  path: Matter.Vector[] = []
  searchPoint?: Matter.Vector
  wanderTime?: number

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
    if (DebugCircle.BOT_POSITION) {
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
    const start = this.feature.body.position
    if (Character.it == null) {
      return null
    }
    if (Character.it !== this) {
      const itVisible = this.isFeatureVisible(Character.it.feature)
      if (itVisible) {
        this.blocked = this.isBlocked()
        if (this.wanderTime != null) {
          this.path = []
          this.wanderTime = undefined
        }
      } else {
        this.blocked = false
      }
      if (this.wanderTime != null && Date.now() - this.wanderTime > Bot.WANDER_TIME) {
        this.path = []
        this.wanderTime = undefined
      }
      if (this.path.length === 0 || this.isPointClose({ point: this.path[0], limit: 15 })) {
        if (this.blocked) {
          return this.unblock()
        } else if (itVisible) {
          return this.flee()
        } else {
          return this.wander(Bot.DEBUG_NOT_IT_CHOICE)
        }
      } else {
        if (Bot.DEBUG_NOT_IT_CHOICE) {
          void new DebugLine({ start, end: this.path[0], color: 'blue' })
          this.path.slice(0, this.path.length - 1).forEach((point, i) => {
            if (this.path != null) {
              void new DebugLine({ start: point, end: this.path[i + 1], color: 'purple' })
            }
          })
        }
        const target = this.getTarget({ path: this.path })
        if (target == null) {
          const target = this.pathfind({ goal: this.path[0] })
          if (target == null) return null
          const debugColor = Bot.DEBUG_NOT_IT_CHOICE ? 'red' : undefined
          return this.getDirection({ end: target, debugColor })
        } else {
          const debugColor = Bot.DEBUG_NOT_IT_CHOICE ? 'green' : undefined
          return this.getDirection({ end: target, debugColor })
        }
      }
    } else { // Character.it === this
      const visibleCharacters = this.getVisibleCharacters()
      if (visibleCharacters.length > 0) {
        this.path = []
        const distances = visibleCharacters.map(character => this.getDistance(character.feature.body.position))
        const close = whichMin(visibleCharacters, distances)
        close.pursuer = this
        const point = vectorToPoint(close.feature.body.position)
        const target = this.pathfind({ goal: point })
        if (target == null) {
          console.warn('It cannot chase visible character')
          return null
        }
        const debugColor = Bot.DEBUG_IT_CHOICE || Bot.DEBUG_CHASE ? 'yellow' : undefined
        return this.getDirection({ end: target, velocity: close.feature.body.velocity, debugColor })
      } else if (this.path.length === 0) {
        if (Bot.DEBUG_IT_CHOICE) console.log('wandering')
        return this.wander(Bot.DEBUG_IT_CHOICE)
      } else if (this.isPointClose({ point: this.path[0], limit: 45 })) {
        if (Bot.DEBUG_IT_CHOICE || Bot.DEBUG_PATHING) console.log('arriving')
        return this.wander(Bot.DEBUG_IT_CHOICE)
      } else {
        if (Bot.DEBUG_IT_CHOICE || Bot.DEBUG_PATHING) {
          this.path.slice(0, this.path.length - 1).forEach((point, i) => {
            if (this.path != null) {
              void new DebugLine({ start: point, end: this.path[i + 1], color: 'purple' })
            }
          })
        }
        const target = this.getTarget({ path: this.path })
        if (target == null) {
          if (Bot.DEBUG_IT_CHOICE || Bot.DEBUG_PATHING) {
            console.log('it pathing...')
            void new DebugLine({ start, end: this.path[0], color: 'orange' })
          }
          const target = this.pathfind({ goal: this.path[0] })
          if (target == null) {
            const debugColor = Bot.DEBUG_IT_CHOICE || Bot.DEBUG_PATHING ? 'pink' : undefined
            return this.getDirection({ end: this.path[0], debugColor })
          }
          const debugColor = Bot.DEBUG_IT_CHOICE || Bot.DEBUG_PATHING ? 'green' : undefined
          return this.getDirection({ end: target, debugColor })
        }
        const debugColor = Bot.DEBUG_IT_CHOICE || Bot.DEBUG_PATHING ? 'red' : undefined
        return this.getDirection({ end: target, debugColor })
      }
    }
  }

  flee (): Direction {
    this.path = []
    const debugColor = Bot.DEBUG_NOT_IT_CHOICE ? 'orange' : undefined
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
    return !this.isPointWallOpen({ point: blockPoint, debug: Bot.DEBUG_CHASE })
  }

  getDistance (point: Matter.Vector): number {
    return getDistance(this.feature.body.position, point)
  }

  getTarget ({ path }: { path: Matter.Vector[] }): Matter.Vector | undefined {
    return path.find(point => this.isPointReachable({ point }))
  }

  getUnblockPoint (): Matter.Vector | null {
    const reachable = Waypoint.waypoints.filter(waypoint => {
      return this.isPointReachable({ point: waypoint.position })
    })
    if (reachable.length === 0) {
      return this.loseWay()
    }
    const far = reachable.filter(waypoint => {
      const isClose = this.isPointClose({ point: waypoint.position, limit: 45 })
      return !isClose
    })
    if (far.length === 0) {
      if (Bot.DEBUG_LOST) {
        Player.players.forEach(player => {
          void new DebugLine({ start: player.feature.body.position, end: this.feature.body.position, color: 'yellow' })
        })
        Bot.lostPoints.push(vectorToPoint(this.feature.body.position))
      }
      return this.feature.body.position
    }
    if (Character.it == null || Character.it === this) {
      throw new Error('No it to unblock from')
    }
    const itAngle = getAnglePercentage(this.feature.body.position, Character.it.feature.body.position)

    const mostDifferent = far.reduce((mostDifferent, waypoint) => {
      const angle = getAnglePercentage(this.feature.body.position, waypoint.position)
      const difference = getAnglePercentageDifference(angle, itAngle)
      if (difference > mostDifferent.difference) {
        return {
          waypoint,
          difference,
          angle
        }
      }
      return mostDifferent
    }, { waypoint: far[0], difference: 0, angle: 0 })

    return mostDifferent.waypoint.position
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

  isPointWallVisionClear ({
    point,
    radius = this.radius,
    debug
  }: {
    point: Matter.Vector
    radius?: number
    debug?: boolean
  }): boolean {
    return Wall.isPointVisionClear({
      start: this.feature.body.position,
      end: point,
      startRadius: this.radius,
      endRadius: radius,
      debug
    })
  }

  isPointWallVisible ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    const inRange = this.isPointInRange(point)
    if (!inRange) return false
    const clear = this.isPointWallVisionClear({ point, debug })
    return clear
  }

  loseIt (): void {
    super.loseIt()
    this.path = []
  }

  loseWay (props?: { goal?: Matter.Vector }): null {
    if (Bot.DEBUG_LOST) {
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
    this.path = []
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
      if (Bot.DEBUG_LOST) {
        console.log('Invisible path start')
      }
      return this.loseWay()
    }

    const visibleFromEnd = Waypoint.waypoints.filter(waypoint => {
      return Wall.isPointOpen({ start: waypoint.position, end: goalPoint, radius: this.radius })
    })
    if (visibleFromEnd.length === 0) {
      if (Bot.DEBUG_LOST) {
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
    this.path = [unblockPoint]
    const debugColor = Bot.DEBUG_NOT_IT_CHOICE ? 'black' : undefined
    return this.getDirection({ end: this.path[0], debugColor })
  }

  wander (debug = Bot.DEBUG_WANDER): Direction | null {
    this.wanderTime = Date.now()
    const debugColor = debug ? 'tan' : undefined
    const waypoint = this.getWanderWaypoint()
    if (waypoint == null) {
      this.path = []
      return this.getDirection({ end: this.feature.body.position })
    }

    this.searchTimes[waypoint.id] = Date.now()
    this.path = [waypoint.position]
    return this.getDirection({ end: this.path[0], debugColor })
  }

  takeInput (controls: Partial<Controls>): void {
    this.controls = { ...this.controls, ...controls }
  }
}
