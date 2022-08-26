import Matter from 'matter-js'
import Character from './Character'
import Controls, { STILL } from '../../shared/controls'
import { everyIsClear } from '../lib/isClear'
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
  static DEBUG_IT_CHOICE = false
  static DEBUG_NOT_IT_CHOICE = false
  static DEBUG_WANDER = false
  static DEBUG_LOST_POINTS = false
  static lostPoints: Matter.Vector[] = []
  fleeing: boolean = false
  searchTimes: number[] = []
  path: Matter.Vector[] = []
  alertPath: Matter.Vector[] = []
  searchPoint?: Matter.Vector
  unblockPoint?: Matter.Vector

  constructor ({ x = 0, y = 0, radius = 15, color = 'green' }: {
    x: number
    y: number
    color?: string
    radius?: number
  }) {
    super({ x, y, color, radius })
    this.searchTimes = Waypoint.waypoints.map((waypoint) => this.getDistance(waypoint.position))
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
        const blockPoint = Matter.Vector.add(start, Matter.Vector.mult(direction, 20))
        const blocked = !this.isPointWallClear({ point: blockPoint, debug: true })
        if (blocked) {
          if (this.unblockPoint == null || this.isPointBoring({ point: this.unblockPoint })) {
            this.unblockPoint = this.getUnblockPoint()
            if (this.unblockPoint == null) return null
          }
          const debugColor = Bot.DEBUG_NOT_IT_CHOICE ? 'black' : undefined
          return this.getDirection({ end: this.unblockPoint, debugColor })
        }
        if (this.unblockPoint != null && !this.isPointClose({ point: itPosition, limit: 150 })) {
          const bored = this.isPointBoring({ point: this.unblockPoint, limit: 125 })
          if (bored) {
            this.unblockPoint = undefined
          } else {
            const debugColor = Bot.DEBUG_NOT_IT_CHOICE ? 'red' : undefined
            return this.getDirection({ end: this.unblockPoint, debugColor })
          }
        }
        this.unblockPoint = undefined

        this.fleeing = true
        const debugColor = Bot.DEBUG_NOT_IT_CHOICE ? 'orange' : undefined
        return Character.it.getDirection({ end: start, debugColor })
      } else {
        this.unblockPoint = undefined

        if (this.fleeing) {
          this.searchPoint = undefined
          this.fleeing = false
        }
        return this.wander(Bot.DEBUG_NOT_IT_CHOICE)
      }
    } else { // Character.it === this
      const visibleCharacters = this.getVisibleCharacters()
      // console.log('this.alertPath.length', this.alertPath.length)
      if (visibleCharacters.length > 0) {
        this.alertPath = []
        const distances = visibleCharacters.map(character => this.getDistance(character.feature.body.position))
        const close = whichMin(visibleCharacters, distances)
        const target = this.pathfind({ end: close.feature.body.position })
        const debugColor = Bot.DEBUG_IT_CHOICE ? 'yellow' : undefined
        return this.getDirection({ end: target, debugColor })
      } else if (this.alertPath.length === 0) {
        if (Bot.DEBUG_IT_CHOICE) console.log('wandering')
        return this.wander(Bot.DEBUG_IT_CHOICE)
      } else if (this.isPointClose({ point: this.alertPath[0], limit: 45 })) {
        if (Bot.DEBUG_IT_CHOICE) console.log('arriving')
        this.alertPath = []
        return this.wander(Bot.DEBUG_IT_CHOICE)
      } else {
        if (Bot.DEBUG_IT_CHOICE) {
          this.alertPath.slice(0, this.alertPath.length - 1).forEach((point, i) => {
            if (this.alertPath != null) {
              void new DebugLine({ start: point, end: this.alertPath[i + 1], color: 'purple' })
            }
          })
        }
        const target = this.alertPath.find(point => this.isPointWallVisible({ point }))
        if (target == null) {
          if (Bot.DEBUG_IT_CHOICE) {
            console.log('pathing')
            void new DebugLine({ start, end: this.alertPath[0], color: 'orange' })
            console.log('picking path...')
          }
          const target = this.pathfind({ end: this.alertPath[0] })
          const debugColor = Bot.DEBUG_IT_CHOICE ? 'green' : undefined
          return this.getDirection({ end: target, debugColor })
        }
        const debugColor = Bot.DEBUG_IT_CHOICE ? 'red' : undefined
        return this.getDirection({ end: target, debugColor })
      }
    }
  }

  getDistance (point: Matter.Vector): number {
    return getDistance(this.feature.body.position, point)
  }

  getUnblockPoint (): Matter.Vector | undefined {
    if (Bot.DEBUG_NOT_IT_CHOICE) console.log('unblocking...')
    const visible = Waypoint.waypoints.filter(waypoint => {
      return this.isPointWallVisible({ point: waypoint.position })
    })
    if (Bot.DEBUG_NOT_IT_CHOICE) {
      visible.forEach(waypoint => new DebugLine({ start: this.feature.body.position, end: waypoint.position, color: 'green' }))
    }
    if (visible.length === 0) {
      console.warn('No vision to unblock')
      Player.players.forEach(player => {
        void new DebugLine({ start: player.feature.body.position, end: this.feature.body.position, color: 'yellow' })
      })
      return undefined
    }
    const far = visible.filter(waypoint => {
      const isClose = this.isPointClose({ point: waypoint.position, limit: 125 })
      return !isClose
    })
    if (far.length === 0) {
      Player.players.forEach(player => {
        void new DebugLine({ start: player.feature.body.position, end: this.feature.body.position, color: 'yellow' })
      })
      console.warn('No distance to unblock')
      return visible[0].position
    }
    const first = far[0]
    if (Character.it == null || Character.it === this) {
      throw new Error('No it to unblock from')
    }
    const itAngle = getAnglePercentage(this.feature.body.position, Character.it.feature.body.position)

    const mostDifferent = far.reduce((mostDifferent, waypoint) => {
      const angle = getAnglePercentage(this.feature.body.position, waypoint.position)
      const difference = getAnglePercentageDifference(angle, itAngle)
      if (Bot.DEBUG_NOT_IT_CHOICE) {
        void new DebugLine({ start: this.feature.body.position, end: waypoint.position, color: 'yellow' })
      }
      if (difference > mostDifferent.difference) {
        return {
          waypoint,
          difference,
          angle
        }
      }
      return mostDifferent
    }, { waypoint: first, difference: 0, angle: 0 })

    return mostDifferent.waypoint.position
  }

  getVisibleCharacters (): Character[] {
    const characters = Character.characters.values()
    const visibleCharacters = []
    for (const character of characters) {
      const isVisible = character !== this && this.isFeatureVisible(character.feature)
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
    const toArrow = Matter.Vector.sub(point, this.feature.body.position)
    const toDirection = Matter.Vector.normalise(toArrow)
    const toPerp = Matter.Vector.perp(toDirection)
    const startPerp = Matter.Vector.mult(toPerp, this.radius)
    const leftStart = Matter.Vector.add(this.feature.body.position, startPerp)
    const rightStart = Matter.Vector.sub(this.feature.body.position, startPerp)

    const leftEnd = Matter.Vector.add(point, startPerp)
    const rightEnd = Matter.Vector.sub(point, startPerp)
    const left = [leftStart, leftEnd]
    const right = [rightStart, rightEnd]
    const casts = [left, right]

    return everyIsClear({ casts, obstacles: Wall.wallObstacles, debug })
  }

  isPointWallVisible ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    const inRange = this.isPointInRange(point)
    if (!inRange) return false
    const clear = this.isPointWallClear({ point, debug })
    return clear
  }

  makeIt (): void {
    super.makeIt()
    this.path = []
  }

  pathfind ({ end }: {
    end: Matter.Vector
  }): Matter.Vector {
    const point = vectorToPoint(end)
    if (this.isPointWallVisible({ point: end })) {
      this.alertPath = [point]

      return point
    }
    const visibleFromStart = Waypoint.waypoints.filter(waypoint => {
      return this.isPointWallVisible({ point: waypoint.position })
    })
    const visibleFromEnd = Waypoint.waypoints.filter(waypoint => {
      return Wall.isClear({ start: waypoint.position, end: point })
    })
    const pairs = visibleFromStart.flatMap(a => visibleFromEnd.map(b => [a, b]))
    const distances = pairs.map(pair => {
      const first = pair[0]
      const last = pair[1]
      const startToFirst = this.getDistance(first.position)
      const firstToLast = first.distances[last.id]
      const lastToEnd = getDistance(last.position, point)
      return startToFirst + firstToLast + lastToEnd
    })
    const pair = whichMin(pairs, distances)
    const waypointPath = pair[0].paths[pair[1].id]
    const reversed = [...waypointPath].reverse()
    reversed.unshift(point)
    this.alertPath = reversed
    const target = this.alertPath.find(point => this.isPointWallVisible({ point }))
    if (target == null) throw new Error('No path target for new path')

    return target
  }

  wander (debug = Bot.DEBUG_WANDER): Direction | null {
    let debugColor = debug ? 'white' : undefined
    if (this.searchPoint == null || this.isPointBoring({ point: this.searchPoint })) {
      if (debug) debugColor = 'gray'
      const visibleTimes = this.searchTimes.filter((time, index) => this.isPointWallVisible({ point: Waypoint.waypoints[index].position }))
      if (visibleTimes.length === 0) {
        if (Bot.DEBUG_LOST_POINTS) {
          const point = vectorToPoint(this.feature.body.position)
          console.warn('Nothing visible to wander to', this.feature.body.id, Math.floor(point.x), Math.floor(point.y))
          Bot.lostPoints.push(point)
          Player.players.forEach(player => {
            void new DebugLine({ start: player.feature.body.position, end: this.feature.body.position, color: 'yellow' })
          })
        }
        return null
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
