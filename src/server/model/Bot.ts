import Matter from 'matter-js'
import Character from './Character'
import Controls, { STILL } from '../../shared/controls'
import isClear, { raycast } from '../lib/raycast'
import Wall from './Wall'
import DebugLine from '../../shared/DebugLine'
import Waypoint from './Waypoint'
import DebugCircle from '../../shared/DebugCircle'
import VISION from '../../shared/VISION'
import { getDistance, vectorToPoint } from '../lib/engine'
import Feature from './Feature'
import Direction from './Direction'

export default class Bot extends Character {
  static oldest: Bot
  static bots = new Map<number, Bot>()
  alertPoint: Matter.Vector
  onAlert: boolean = false
  unblocking: boolean = true
  fleeing: boolean = false
  searchArray: Matter.Vector[] = []
  searchIndex = 1
  searchGoal: Matter.Vector
  searchTarget: Matter.Vector

  constructor ({ x = 0, y = 0, radius = 15, color = 'green' }: {
    x: number
    y: number
    color?: string
    radius?: number
  }) {
    super({ x, y, color, radius })
    this.alertPoint = { x, y }
    this.searchGoal = Waypoint.waypoints[0].position
    this.searchTarget = Waypoint.waypoints[0].position
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

  getGoalTarget (goal: Matter.Vector): Matter.Vector {
    const start = this.feature.body.position
    const goalWaypoint = this.getGoalWaypoint(goal)
    const path = goalWaypoint.getVectorPath(goal)
    // Should this path be allowed to go through walls?
    path.slice(0, path.length - 1).forEach((point, index) => {
      // const next = path[index + 1]
      // return new DebugLine({ start: point, end: next, color: 'purple' })
    })
    const target = path.reduce((a, b) => {
      const hit = raycast({ start, end: b, obstacles: Wall.wallObstacles })
      return hit === false ? b : a
    })
    return target
  }

  getVisibleCharacters (): Character[] {
    const characters = Character.characters.values()
    const visibleCharacters = []
    for (const character of characters) {
      const isVisible = this.isPointVisible(character.feature.body.position)
      if (isVisible) visibleCharacters.push(character)
    }
    return visibleCharacters
  }

  updateSearch (): void {
    // console.trace('updateSearchPosition')
    this.searchGoal = this.searchArray[this.searchIndex]
    this.searchIndex = (this.searchIndex + 1) % this.searchArray.length
  }

  chooseArrow (): Direction | null {
    const start = this.feature.body.position
    if (DebugCircle.botPosition) {
      const debugCircleColor = Character.it === this ? 'red' : 'white'
      void new DebugCircle({ x: start.x, y: start.y, radius: 10, color: debugCircleColor })
    }
    const searchNear = this.isPointWallVisible(this.searchGoal)
    if (searchNear) {
      this.updateSearch()
    }
    // void new DebugLine({ start, end: this.searchGoal, color: 'yellow' })
    if (Character.it === this) {
      const closestVisible: { distance: number, enemy?: Character } = { distance: Infinity }
      const visibleCharacters = this.getVisibleCharacters()
      for (const character of visibleCharacters) {
        if (character !== this) {
          const distance = getDistance(start, character.feature.body.position)
          if (distance < closestVisible.distance) {
            this.alertPoint = vectorToPoint(character.feature.body.position)
            this.onAlert = true
            closestVisible.enemy = character
            closestVisible.distance = distance
          }
        }
      }
      if (this.onAlert) {
        const alertDistance = getDistance(this.alertPoint, start)
        if (alertDistance < 45) {
          this.onAlert = false
          this.updateSearch()
        } else {
          this.searchGoal = this.alertPoint
        }
      }
      if (closestVisible.enemy == null) {
        const goal = this.onAlert ? this.alertPoint : this.searchGoal
        this.searchTarget = this.getGoalTarget(this.searchGoal)
        const target = this.isPointClear(goal) ? goal : this.searchTarget
        return new Direction({ start: start, end: target, debugColor: 'white' })
      } else {
        const goal = closestVisible.enemy.feature.body.position
        const target = this.isPointClear(goal) ? goal : this.getGoalTarget(goal)
        const debugColor = this.onAlert ? 'red' : 'grey'
        this.updateSearch()
        return new Direction({ start: start, end: target, debugColor })
      }
    } else if (Character.it != null) {
      const itPos = Character.it.feature.body.position
      const itVisible = this.isPointVisible(itPos)
      if (itVisible) {
        const vector = Matter.Vector.sub(start, itPos)
        const distance = Matter.Vector.magnitude(vector)
        const direction = Matter.Vector.normalise(vector)
        const checkPoint = Matter.Vector.add(start, Matter.Vector.mult(direction, 16))
        const blocked = Matter.Query.point(Wall.wallObstacles, checkPoint).length > 0
        this.fleeing = true
        if (this.unblocking && distance < 150) {
          this.unblocking = false
          this.updateSearch()
        }
        if (blocked || this.unblocking) {
          this.unblocking = true
        } else {
          return new Direction({ start: itPos, end: start, debugColor: 'orange' })
        }
      } else {
        if (this.fleeing) {
          this.updateSearch()
          this.fleeing = false
        }
        this.unblocking = false
      }
      this.searchTarget = this.getGoalTarget(this.searchGoal)
      // SPEEDUP
      // if (!this.isPointWallClear(this.searchTarget) || this.isPointWallVisible(this.searchTarget)) {
      //   this.updateSearch()
      //   this.searchTarget = this.searchGoal
      // }
      // void new DebugLine({ start, end: this.searchTarget, color: 'teal' })
      // END SPEEDUP
      return new Direction({ start: start, end: this.searchTarget, debugColor: 'teal' })
    }
    return null
  }

  chooseControls (): Partial<Controls> {
    const arrow = this.chooseArrow()
    if (arrow == null) {
      const debugColor = Character.it === this ? 'red' : 'white'
      void new DebugCircle({
        x: this.feature.body.position.x,
        y: this.feature.body.position.y,
        radius: 10,
        color: debugColor
      })
      return STILL
    }
    const controls = arrow.getControls()

    return controls
  }

  act (): void {
    const choice = this.chooseControls()
    this.takeInput(choice)
    super.act()
  }
}
