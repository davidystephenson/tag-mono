import Matter from 'matter-js'
import Character from './Character'
import Controls, { STILL } from '../../shared/controls'
import Wall from './Wall'
import DebugLine from '../../shared/DebugLine'
import Waypoint from './Waypoint'
import DebugCircle from '../../shared/DebugCircle'
import VISION from '../../shared/VISION'
import { getDistance, vectorToPoint } from '../lib/engine'
import Direction from './Direction'
import { getAnglePercentage, getAnglePercentageDifference, whichMax, whichMin } from '../lib/math'
import Player from './Player'

export default class Bot extends Character {
  static oldest: Bot
  static DEBUG_CHASE = true
  static DEBUG_PATHING = true
  static DEBUG_IT_CHOICE = false
  static DEBUG_NOT_IT_CHOICE = true
  static DEBUG_WANDER = false
  static DEBUG_LOST = true
  static WANDER_TIME = 15000
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
      const itPosition = Character.it.feature.body.position

      const itVisible = this.isFeatureVisible(Character.it.feature)
      if (itVisible) {
        this.searchPoint = undefined

        const vector = Matter.Vector.sub(start, itPosition)
        const direction = Matter.Vector.normalise(vector)
        const blockPoint = Matter.Vector.add(start, Matter.Vector.mult(direction, 30))
        this.blocked = !this.isPointWallClear({ point: blockPoint, debug: Bot.DEBUG_CHASE })
        if (this.blocked) {
          if (this.path.length === 0 || this.isPointClose({ point: this.path[0] })) {
            const unblockPoint = this.getUnblockPoint()
            if (unblockPoint == null) {
              return this.flee()
            }
            this.path = [unblockPoint]
            const debugColor = Bot.DEBUG_NOT_IT_CHOICE ? 'black' : undefined
            return this.getDirection({ end: this.path[0], debugColor })
          }
          if (Bot.DEBUG_NOT_IT_CHOICE || Bot.DEBUG_PATHING) {
            this.path.slice(0, this.path.length - 1).forEach((point, i) => {
              if (this.path != null) {
                void new DebugLine({ start: point, end: this.path[i + 1], color: 'purple' })
              }
            })
          }
          const target = this.getTarget({ path: this.path })
          if (target == null) {
            const unblockPoint = this.getUnblockPoint()
            if (unblockPoint == null) {
              return this.flee()
            }
            this.path = [unblockPoint]
            const debugColor = Bot.DEBUG_NOT_IT_CHOICE || Bot.DEBUG_PATHING ? 'black' : undefined
            return this.getDirection({ end: this.path[0], debugColor })
          }

          const debugColor = Bot.DEBUG_NOT_IT_CHOICE || Bot.DEBUG_PATHING ? 'green' : undefined
          return this.getDirection({ end: target, debugColor })
        }
        if (this.isPointClose({ point: itPosition, limit: 200 })) {
          return this.flee()
        }
        if (this.path.length > 0) {
          if (this.isPointClose({ point: this.path[0] })) {
            return this.flee()
          }

          if (Bot.DEBUG_NOT_IT_CHOICE || Bot.DEBUG_PATHING) {
            this.path.slice(0, this.path.length - 1).forEach((point, i) => {
              if (this.path != null) {
                void new DebugLine({ start: point, end: this.path[i + 1], color: 'purple' })
              }
            })
          }
          const target = this.getTarget({ path: this.path })
          if (target == null) {
            if (Bot.DEBUG_NOT_IT_CHOICE || Bot.DEBUG_PATHING) {
              console.log('not it pathing...')
              void new DebugLine({ start, end: this.path[0], color: 'orange' })
            }
            const target = this.pathfind({ goal: this.path[0] })
            if (target == null) {
              return this.flee()
            }
            const debugColor = Bot.DEBUG_NOT_IT_CHOICE || Bot.DEBUG_PATHING ? 'pink' : undefined
            return this.getDirection({ end: target, debugColor })
          }
          const debugColor = Bot.DEBUG_NOT_IT_CHOICE || Bot.DEBUG_PATHING ? 'red' : undefined
          return this.getDirection({ end: target, debugColor })
        }

        return this.flee()
      } else {
        return this.wander(Bot.DEBUG_NOT_IT_CHOICE)
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

  getDistance (point: Matter.Vector): number {
    return getDistance(this.feature.body.position, point)
  }

  getTarget ({ path }: { path: Matter.Vector[] }): Matter.Vector | undefined {
    return path.find(point => this.isPointWallVisible({ point }))
  }

  getUnblockPoint (): Matter.Vector | null {
    const visible = Waypoint.waypoints.filter(waypoint => {
      return this.isPointWallVisible({ point: waypoint.position })
    })
    if (visible.length === 0) {
      return this.loseWay()
    }
    const far = visible.filter(waypoint => {
      const isClose = this.isPointClose({ point: waypoint.position, limit: 45 })
      return !isClose
    })
    if (far.length === 0) {
      Player.players.forEach(player => {
        void new DebugLine({ start: player.feature.body.position, end: this.feature.body.position, color: 'yellow' })
      })
      Bot.lostPoints.push(vectorToPoint(this.feature.body.position))
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

  getVisibleCharacters (): Character[] {
    const characters = Character.characters.values()
    const visibleCharacters = []
    for (const character of characters) {
      const isVisible =
        character !== this &&
        character.controllable &&
        this.isFeatureVisible(character.feature)
      if (isVisible) visibleCharacters.push(character)
    }
    return visibleCharacters
  }

  isPointBoring ({ point, limit = 45 }: { point: Matter.Vector, limit?: number }): boolean {
    const close = this.isPointClose({ point, limit })
    if (close) return true

    const visible = this.isPointWallVisible({ point })
    return !visible
  }

  isPointClose ({ point, limit = 45 }: { point: Matter.Vector, limit?: number }): boolean {
    const distance = this.getDistance(point)
    const close = distance < limit
    return close
  }

  isPointInRange (point: Matter.Vector): boolean {
    const start = this.feature.body.position
    const inRangeX = start.x - VISION.width < point.x && point.x < start.x + VISION.width
    if (!inRangeX) return false
    const inRangeY = start.y - VISION.height < point.y && point.y < start.y + VISION.height
    return inRangeY
  }

  isPointWallClear ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    return Wall.isPointClear({ start: this.feature.body.position, end: point, radius: this.radius, debug })
  }

  isPointWallVisible ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    const inRange = this.isPointInRange(point)
    if (!inRange) return false
    const clear = this.isPointWallClear({ point, debug })
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
    this.path = []
  }

  pathfind ({ goal }: {
    goal: Matter.Vector
  }): Matter.Vector | null {
    const goalPoint = vectorToPoint(goal)
    if (this.isPointWallVisible({ point: goalPoint })) {
      this.path = [goalPoint]

      return goalPoint
    }
    const visibleFromStart = Waypoint.waypoints.filter(waypoint => {
      return this.isPointWallVisible({ point: waypoint.position })
    })
    if (visibleFromStart.length === 0) {
      console.log('Invisible path start')
      return this.loseWay()
    }

    const visibleFromEnd = Waypoint.waypoints.filter(waypoint => {
      return Wall.isPointClear({ start: waypoint.position, end: goalPoint, radius: this.radius })
    })
    if (visibleFromEnd.length === 0) {
      console.log('Invisible path goal')
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

  wander (debug = Bot.DEBUG_WANDER): Direction | null {
    this.path = []

    let debugColor = debug ? 'peru' : undefined
    if (this.searchPoint == null || this.isPointBoring({ point: this.searchPoint }) || (this.wanderTime != null && (Date.now() - this.wanderTime) > Bot.WANDER_TIME)) {
      this.wanderTime = Date.now()
      if (debug) debugColor = 'tan'
      const visibleTimes = this.searchTimes.filter((time, index) => this.isPointWallVisible({ point: Waypoint.waypoints[index].position }))
      if (visibleTimes.length === 0) {
        return this.loseWay()
      }
      const earlyTime = Math.min(...visibleTimes)
      const earlyIds = Waypoint.ids.filter(id => this.searchTimes[id] === earlyTime)
      const earlyDistances = earlyIds.map(id => this.getDistance(this.feature.body.position))
      const earlyFarId = whichMax(earlyIds, earlyDistances)
      this.searchPoint = Waypoint.waypoints[earlyFarId].position
      this.searchTimes[earlyFarId] = Date.now()
    }
    return this.getDirection({ end: this.searchPoint, debugColor })
  }

  takeInput (controls: Partial<Controls>): void {
    this.controls = { ...this.controls, ...controls }
  }
}
