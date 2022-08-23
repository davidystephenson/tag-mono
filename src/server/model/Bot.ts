import Matter from 'matter-js'
import Character from './Character'
import Controls, { STILL } from '../../shared/controls'
import { everyClearPoint } from '../lib/raycast'
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
  static DEBUG_IT_CHASE = false
  static DEBUG_IT_CHOICE = true
  static DEBUG_NOT_IT_CHOICE = false
  static DEBUG_WANDER = false
  static DEBUG_LOST_POINTS = false
  static lostPoints: Matter.Vector[] = []
  alertPoint?: Matter.Vector
  unblocking: boolean = true
  fleeing: boolean = false
  searchTimes: number[] = []
  alertPath?: Matter.Vector[]
  searchPoint?: Matter.Vector
  unblockPoint?: Matter.Vector

  constructor ({ x = 0, y = 0, radius = 15, color = 'green' }: {
    x: number
    y: number
    color?: string
    radius?: number
  }) {
    super({ x, y, color, radius })
    this.searchTimes = Waypoint.waypoints.map((waypoint) => waypoint.id)
    if (Bot.oldest == null) Bot.oldest = this
  }

  takeInput (controls: Partial<Controls>): void {
    this.controls = { ...this.controls, ...controls }
  }

  isPointWallClear (point: Matter.Vector): boolean {
    const viewpoints = this.getViewpoints(point)

    return everyClearPoint({
      starts: viewpoints,
      end: point,
      obstacles: Wall.wallObstacles
    })
  }

  isPointInRange (point: Matter.Vector): boolean {
    const start = this.feature.body.position
    const inRangeX = start.x - VISION.width < point.x && point.x < start.x + VISION.width
    if (!inRangeX) return false
    const inRangeY = start.y - VISION.height < point.y && point.y < start.y + VISION.height
    return inRangeY
  }

  isPointWallVisible (point: Matter.Vector): boolean {
    const inRange = this.isPointInRange(point)
    if (!inRange) return false
    const clear = this.isPointWallClear(point)
    return clear
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

  isPointClose ({ point, limit = 45 }: { point: Matter.Vector, limit?: number }): boolean {
    const distance = getDistance(this.feature.body.position, point)
    const close = distance < limit
    return close
  }

  isPointBoring ({ point, limit = 45 }: { point: Matter.Vector, limit?: number }): boolean {
    const close = this.isPointClose({ point, limit })
    if (close) return true

    const visible = this.isPointWallVisible(point)
    return !visible
  }

  getUnblockPoint (): Matter.Vector {
    const visible = Waypoint.waypoints.filter(waypoint => {
      return this.isPointWallVisible(waypoint.position)
    })
    if (visible.length === 0) {
      console.warn('No vision to unblock')
      Player.players.forEach(player => {
        void new DebugLine({ start: player.feature.body.position, end: this.feature.body.position, color: 'red' })
      })
      return this.feature.body.position
    }
    const far = visible.filter(waypoint => {
      const isClose = this.isPointClose({ point: waypoint.position, limit: 125 })
      return !isClose
    })
    if (far.length === 0) {
      Player.players.forEach(player => {
        void new DebugLine({ start: player.feature.body.position, end: this.feature.body.position, color: 'green' })
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
        void new DebugLine({ start: this.feature.body.position, end: waypoint.position, color: 'green' })
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

  wander (debug = Bot.DEBUG_WANDER): Direction {
    let debugColor = debug ? 'white' : undefined
    if (this.searchPoint == null || this.isPointBoring({ point: this.searchPoint })) {
      if (debug) debugColor = 'gray'
      const visibleTimes = this.searchTimes.filter((time, index) => this.isPointWallVisible(Waypoint.waypoints[index].position))
      if (visibleTimes.length === 0) {
        if (Bot.DEBUG_LOST_POINTS) {
          const point = vectorToPoint(this.feature.body.position)
          console.warn('Nothing visible to wander to', this.feature.body.id, Math.floor(point.x), Math.floor(point.y))
          Bot.lostPoints.push(point)
          Player.players.forEach(player => {
            void new DebugLine({ start: player.feature.body.position, end: this.feature.body.position, color: 'yellow' })
          })
        }
        return new Direction({ start: this.feature.body.position, end: this.feature.body.position, debugColor })
      }
      const earlyTime = Math.min(...visibleTimes)
      const earlyIds = Waypoint.ids.filter(id => this.searchTimes[id] === earlyTime)
      const earlyDistances = earlyIds.map(id => getDistance(this.feature.body.position, Waypoint.waypoints[id].position))
      const earlyFarId = whichMax(earlyIds, earlyDistances)
      this.searchPoint = Waypoint.waypoints[earlyFarId]
      this.searchTimes[earlyFarId] = Date.now()
    }
    return new Direction({ start: this.feature.body.position, end: this.searchPoint, debugColor })
  }

  chooseArrow (): Direction | null {
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
        const checkPoint = Matter.Vector.add(start, Matter.Vector.mult(direction, 125))
        const blocked = Matter.Query.point(Wall.wallObstacles, checkPoint).length > 0
        if (blocked) {
          if (this.unblockPoint == null || this.isPointBoring({ point: this.unblockPoint })) {
            this.unblockPoint = this.getUnblockPoint()
          }

          const debugColor = Bot.DEBUG_NOT_IT_CHOICE ? 'black' : undefined
          return new Direction({ start, end: this.unblockPoint, debugColor })
        }
        if (this.unblockPoint != null && !this.isPointClose({ point: itPosition, limit: 150 })) {
          const bored = this.isPointBoring({ point: this.unblockPoint, limit: 125 })
          if (bored) {
            this.unblockPoint = undefined
          } else {
            const debugColor = Bot.DEBUG_NOT_IT_CHOICE ? 'red' : undefined
            return new Direction({ start: start, end: this.unblockPoint, debugColor })
          }
        }
        this.unblockPoint = undefined

        this.fleeing = true
        const debugColor = Bot.DEBUG_NOT_IT_CHOICE ? 'orange' : undefined
        return new Direction({ start: itPosition, end: start, debugColor })
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
        this.alertPoint = undefined
        this.alertPath = undefined
        const distances = visibleCharacters.map(character => getDistance(start, character.feature.body.position))
        const closeChar = whichMin(visibleCharacters, distances)
        this.alertPoint = vectorToPoint(closeChar.feature.body.position)
        const debugColor = Bot.DEBUG_IT_CHOICE || Bot.DEBUG_IT_CHASE ? 'yellow' : undefined
        return new Direction({ start, end: closeChar.feature.body.position, debugColor })
      } else if (this.alertPoint == null) {
        if (Bot.DEBUG_IT_CHOICE) console.log('wandering')
        return this.wander(Bot.DEBUG_IT_CHOICE)
      } else if (getDistance(start, this.alertPoint) < 45) {
        if (Bot.DEBUG_IT_CHOICE) console.log('arriving')
        this.alertPoint = undefined
        return this.wander(Bot.DEBUG_IT_CHOICE)
      } else if (this.isPointWallVisible(this.alertPoint)) {
        if (Bot.DEBUG_IT_CHOICE) console.log('alerting')
        this.alertPath = undefined
        return new Direction({ start, end: this.alertPoint, debugColor: 'pink' })
      } else {
        if (Bot.DEBUG_IT_CHOICE) console.log('pathing')
        if (this.alertPath != null) {
          if (this.alertPath.length === 0) {
            throw new Error('alertPath is empty')
          }
          if (this.alertPath.length === 1) {
            throw new Error('alertPath is only alertPoint')
          }
          if (DebugLine.ALERT_PATH) {
            this.alertPath.slice(0, this.alertPath.length - 1).forEach((point, i) => {
              if (this.alertPath != null) {
                void new DebugLine({ start: point, end: this.alertPath[i + 1], color: 'purple' })
              }
            })
          }
          const target = this.alertPath.find(point => this.isPointWallVisible(point))
          if (target != null) {
            const debugColor = Bot.DEBUG_IT_CHOICE ? 'red' : undefined
            return new Direction({ start, end: target, debugColor })
          }
        }
        console.log('picking path...')
        const visibleFromStart = Waypoint.waypoints.filter(waypoint => {
          return this.isPointWallVisible(waypoint.position)
        })
        const distances = visibleFromStart.map(visibleWaypoint => {
          const startToWaypoint = getDistance(visibleWaypoint.position, start)
          if (this.alertPoint == null) throw new Error('Cannot create alert path without alert point')
          const waypointToGoal = visibleWaypoint.getDistance(this.alertPoint)
          return startToWaypoint + waypointToGoal
        })
        const startWaypoint = whichMin(visibleFromStart, distances)
        this.alertPath = startWaypoint.getVectorPath(this.alertPoint)
        this.alertPath.reverse()
        const newTarget = this.alertPath.find(point => this.isPointWallVisible(point))
        if (newTarget == null) throw new Error('No path target for new path')
        return new Direction({ start, end: newTarget, debugColor: 'green' })
      }
    }
  }

  chooseControls (): Partial<Controls> {
    const arrow = this.chooseArrow()
    if (arrow == null) {
      return STILL
    }
    const controls = arrow.getControls()

    return controls
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
}
