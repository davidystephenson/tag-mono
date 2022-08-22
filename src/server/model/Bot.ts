import Matter from 'matter-js'
import Character from './Character'
import Controls, { STILL } from '../../shared/controls'
import isClear from '../lib/raycast'
import Wall from './Wall'
import DebugLine from '../../shared/DebugLine'
import Waypoint from './Waypoint'
import DebugCircle from '../../shared/DebugCircle'
import VISION from '../../shared/VISION'
import { getDistance, vectorToPoint } from '../lib/engine'
import Feature from './Feature'
import Direction from './Direction'
import { getAnglePercentage, getAnglePercentageDifference, whichMax, whichMin } from '../lib/math'
import Player from './Player'

export default class Bot extends Character {
  static oldest: Bot
  static bots = new Map<number, Bot>()
  static DEBUG_IT_CHASE = true
  static DEBUG_IT_CHOICE = false
  static DEBUG_NOT_IT_CHOICE = true
  alertPoint?: Matter.Vector
  onAlert: boolean = false
  unblocking: boolean = true
  fleeing: boolean = false
  searchArray: Matter.Vector[] = []
  searchTimes: number[] = []
  alertPath: Matter.Vector[] = []
  alertTarget?: Matter.Vector
  searchIndex = 1
  searchGoal: Matter.Vector
  searchTarget?: Waypoint
  unblockTarget?: Waypoint

  constructor ({ x = 0, y = 0, radius = 15, color = 'green' }: {
    x: number
    y: number
    color?: string
    radius?: number
  }) {
    super({ x, y, color, radius })
    this.searchGoal = Waypoint.waypoints[0].position
    const searchWaypointArray = [Waypoint.waypoints[0]]
    const waypoints = [...Waypoint.waypoints]
    console.log('Start While Loop')
    while (waypoints.length > 0) {
      const distances = waypoints.map(waypoint => {
        const distFromSearchPoints = searchWaypointArray.map(searchPoint => waypoint.distances[searchPoint.id])
        return Math.min(...distFromSearchPoints)
      })
      const index = distances.indexOf(Math.max(...distances))
      searchWaypointArray.push(waypoints[index])
      waypoints[index] = waypoints[waypoints.length - 1]
      waypoints.pop()
    }
    this.searchArray = searchWaypointArray.map(waypoint => waypoint.position)
    this.searchTimes = Waypoint.waypoints.map(() => 0)
    console.log('End While Loop')
    if (typeof (Bot.oldest) === 'undefined') Bot.oldest = this
  }

  takeInput (controls: Partial<Controls>): void {
    this.controls = { ...this.controls, ...controls }
  }

  isPointWallClear (point: Matter.Vector): boolean {
    return isClear({
      start: this.feature.body.position,
      end: point,
      obstacles: Wall.wallObstacles
    })
  }

  isPointClear (point: Matter.Vector): boolean {
    return isClear({
      start: this.feature.body.position,
      end: point,
      obstacles: Feature.obstacles
    })
  }

  isPointInRange (point: Matter.Vector): boolean {
    const start = this.feature.body.position
    const visibleX = start.x - VISION.width < point.x && point.x < start.x + VISION.width
    if (!visibleX) return false
    const visibleY = start.y - VISION.height < point.y && point.y < start.y + VISION.height
    if (!visibleY) return false
    return true
  }

  isPointWallVisible (point: Matter.Vector): boolean {
    const start = this.feature.body.position
    const visibleX = start.x - VISION.width < point.x && point.x < start.x + VISION.width
    if (!visibleX) return false
    const visibleY = start.y - VISION.height < point.y && point.y < start.y + VISION.height
    if (!visibleY) return false
    const clearSearchPos = this.isPointWallClear(point)
    return clearSearchPos
  }

  isPointVisible (point: Matter.Vector): boolean {
    const start = this.feature.body.position
    const visibleX = start.x - VISION.width < point.x && point.x < start.x + VISION.width
    if (!visibleX) return false
    const visibleY = start.y - VISION.height < point.y && point.y < start.y + VISION.height
    if (!visibleY) return false
    const clearSearchPos = this.isPointClear(point)
    return clearSearchPos
  }

  getGoalWaypoint (goal: Matter.Vector): Waypoint {
    const start = this.feature.body.position
    const visibleFromStart = Waypoint.waypoints.filter(waypoint => {
      return this.isPointWallVisible(waypoint.position)
    })
    const distances = visibleFromStart.map(visibleWaypoint => {
      const startToWaypoint = getDistance(visibleWaypoint.position, start)
      const waypointToGoal = visibleWaypoint.getDistance(goal)
      return startToWaypoint + waypointToGoal
    })
    return visibleFromStart[distances.indexOf(Math.min(...distances))]
  }

  getVisibleCharacters (): Character[] {
    const characters = Character.characters.values()
    const visibleCharacters = []
    for (const character of characters) {
      const isVisible = character !== this && this.isPointVisible(character.feature.body.position)
      if (isVisible) visibleCharacters.push(character)
    }
    return visibleCharacters
  }

  updateSearch (): void {
    // console.trace('updateSearchPosition')
    const start = this.feature.body.position
    const visibleTimes = this.searchTimes.filter((time, index) => this.isPointInRange(this.searchArray[index]))
    const minTime = Math.min(...visibleTimes)
    const indices = Array.from(Array(this.searchTimes.length).keys())
    const searchIndices = indices.filter(i => this.searchTimes[i] === minTime)
    const distances = searchIndices.map(i => getDistance(start, this.searchArray[i]))
    this.searchIndex = searchIndices[distances.indexOf(Math.min(...distances))]
    this.searchGoal = this.searchArray[this.searchIndex]
    this.searchTimes[this.searchIndex] = Date.now()

    // this.searchIndex = (this.searchIndex + 1) % this.searchArray.length
    // const newGoal = this.searchArray[this.searchIndex]
    // if (this.isPointInRange(newGoal)) {
    //   this.searchGoal = this.searchArray[this.searchIndex]
    // }
  }

  isPointClose ({ point, limit = 45 }: { point: Matter.Vector, limit?: number }): boolean {
    const distance = getDistance(this.feature.body.position, point)
    const close = distance < limit
    return close
  }

  isPointBoring (point: Matter.Vector): boolean {
    const close = this.isPointClose({ point })
    if (close) return true

    const visible = this.isPointWallVisible(point)
    return !visible
  }

  getUnblockWaypoint (): Waypoint {
    const visible = Waypoint.waypoints.filter(waypoint => {
      return this.isPointWallVisible(waypoint.position)
    })
    const far = visible.filter(waypoint => {
      const isClose = this.isPointClose({ point: waypoint.position })
      return !isClose
    })
    const first = far[0]
    if (Character.it == null || Character.it === this) {
      return first
    }
    const itAngle = getAnglePercentage(this.feature.body.position, Character.it.feature.body.position)

    console.log('far', far.length)
    const mostDifferent = far.reduce((mostDifferent, waypoint) => {
      const angle = getAnglePercentage(this.feature.body.position, waypoint.position)
      const difference = getAnglePercentageDifference(angle, itAngle)
      void new DebugLine({ start: this.feature.body.position, end: waypoint.position, color: 'green' })
      if (difference > mostDifferent.difference) {
        return {
          waypoint,
          difference,
          angle
        }
      }
      return mostDifferent
    }, { waypoint: first, difference: 0, angle: 0 })

    // void new DebugLine({ start: this.feature.body.position, end: mostDifferent.waypoint.position, color: 'red' })
    console.log('mostDifferent test:', mostDifferent.waypoint.id)

    return mostDifferent.waypoint
  }

  wander (debug = true): Direction {
    let debugColor = debug ? 'white' : undefined
    if (this.searchTarget == null || this.isPointBoring(this.searchTarget.position)) {
      if (debug) debugColor = 'gray'
      const visibleTimes = this.searchTimes.filter((time, index) => this.isPointWallVisible(Waypoint.waypoints[index].position))
      const earlyTime = Math.min(...visibleTimes)
      const earlyIds = Waypoint.ids.filter(id => this.searchTimes[id] === earlyTime)
      if (earlyIds.length < 1) {
        console.warn('Bot has no visible waypoints:', this.feature.body.position)
        Player.players.forEach(player => {
          void new DebugLine({ start: player.feature.body.position, end: this.feature.body.position, color: 'yellow' })
        })
        return new Direction({ start: this.feature.body.position, end: this.feature.body.position, debugColor })
      }
      const earlyDistances = earlyIds.map(id => getDistance(this.feature.body.position, Waypoint.waypoints[id].position))
      const earlyFarId = whichMax(earlyIds, earlyDistances)
      this.searchTarget = Waypoint.waypoints[earlyFarId]
      this.searchTimes[earlyFarId] = Date.now()
    }
    return new Direction({ start: this.feature.body.position, end: this.searchTarget.position, debugColor })
  }

  chooseArrow (): Direction | null {
    const start = this.feature.body.position
    if (Character.it == null) {
      return null
    }
    if (Character.it !== this) {
      const itPosition = Character.it.feature.body.position

      const itVisible = this.isPointVisible(itPosition)
      if (itVisible) {
        this.searchTarget = undefined

        const vector = Matter.Vector.sub(start, itPosition)
        const direction = Matter.Vector.normalise(vector)
        const checkPoint = Matter.Vector.add(start, Matter.Vector.mult(direction, 30))
        const blocked = Matter.Query.point(Wall.wallObstacles, checkPoint).length > 0
        if (blocked && this.unblockTarget == null) {
          this.unblockTarget = this.getUnblockWaypoint()
        }
        const itClose = this.isPointClose({ point: itPosition, limit: 125 })
        if (!itClose && this.unblockTarget != null) {
          const bored = this.isPointBoring(this.unblockTarget.position)
          if (bored) {
            this.unblockTarget = undefined
          } else {
            return new Direction({ start: start, end: this.unblockTarget, debugColor: 'red' })
          }
        }
        this.unblockTarget = undefined

        this.fleeing = true
        const debugColor = Bot.DEBUG_NOT_IT_CHOICE ? 'orange' : undefined
        return new Direction({ start: itPosition, end: start, debugColor })
      } else {
        this.unblockTarget = undefined

        if (this.fleeing) {
          this.searchTarget = undefined
          this.fleeing = false
        }
        return this.wander(Bot.DEBUG_NOT_IT_CHOICE)
      }
    } else { // Character.it === this
      const visibleCharacters = this.getVisibleCharacters()
      // console.log('this.alertPath.length', this.alertPath.length)
      if (visibleCharacters.length > 0) {
        this.alertPoint = undefined
        this.alertPath = []
        const distances = visibleCharacters.map(character => getDistance(start, character.feature.body.position))
        const closeChar = whichMin(visibleCharacters, distances)
        this.alertPoint = vectorToPoint(closeChar.feature.body.position)
        if (Bot.DEBUG_IT_CHOICE) console.log('chasing')
        const debugColor = Bot.DEBUG_IT_CHOICE || Bot.DEBUG_IT_CHASE ? 'yellow' : undefined
        return new Direction({ start, end: closeChar.feature.body.position, debugColor })
      } else if (this.alertPoint == null) {
        if (Bot.DEBUG_IT_CHOICE) console.log('wandering')
        return this.wander(Bot.DEBUG_IT_CHOICE)
      } else if (getDistance(start, this.alertPoint) < 45) {
        this.alertPoint = undefined
        if (Bot.DEBUG_IT_CHOICE) console.log('giving up')
        return this.wander(Bot.DEBUG_IT_CHOICE)
      } else if (this.isPointWallVisible(this.alertPoint)) {
        if (Bot.DEBUG_IT_CHOICE) console.log('alerting')
        this.alertPath = []
        return new Direction({ start, end: this.alertPoint, debugColor: 'pink' })
      } else {
        if (Bot.DEBUG_IT_CHOICE) console.log('pathing')
        if (DebugLine.ALERT_PATH) {
          this.alertPath.slice(0, this.alertPath.length - 1).forEach((point, i) => {
            void new DebugLine({ start: point, end: this.alertPath[i + 1], color: 'purple' })
          })
        }
        const target = this.alertPath.find(point => this.isPointWallVisible(point))
        if (target != null) return new Direction({ start, end: target, debugColor: 'red' })
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
