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
  searchArray: Matter.Vector[] = []
  searchIndex = 1
  searchPosition: Matter.Vector

  constructor ({ x = 0, y = 0, radius = 15, color = 'green' }: {
    x: number
    y: number
    color?: string
    radius?: number
  }) {
    super({ x, y, color, radius })
    this.alertPoint = { x, y }
    this.searchPosition = Waypoint.waypoints[0].position
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
      const next = path[index + 1]
      return new DebugLine({ start: point, end: next, color: 'blue' })
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

  updateSearchPosition (): void {
    // console.trace('updateSearchPosition')
    this.searchPosition = this.searchArray[this.searchIndex]
    this.searchIndex = (this.searchIndex + 1) % this.searchArray.length
  }

  chooseArrow (): Direction | null {
    const start = this.feature.body.position
    if (DebugCircle.botPosition) {
      const debugCircleColor = Character.it === this ? 'red' : 'white'
      void new DebugCircle({ x: start.x, y: start.y, radius: 10, color: debugCircleColor })
    }
    // SAFE VERSION
    // const searchClear = this.isPointClear(this.searchPosition)
    // const searchNear = this.isPointWallVisible(this.searchPosition)
    // if (searchNear || !searchClear) {
    //   this.updateSearchPosition()
    // }
    // DANGEROUS VERSION
    const visibleCharacters = this.getVisibleCharacters()
    const searchNear = this.isPointWallVisible(this.searchPosition)
    if (searchNear) {
      this.updateSearchPosition()
    }
    // END OF DANGEROUS VERSION
    void new DebugLine({ start, end: this.searchPosition, color: 'aqua' })
    if (Character.it === this) {
      const closest: { distance: number, enemy?: Character } = { distance: Infinity }
      for (const character of visibleCharacters) {
        if (character !== this) {
          const distance = getDistance(start, character.feature.body.position)
          if (distance < closest.distance) {
            this.alertPoint = vectorToPoint(character.feature.body.position)
            this.onAlert = true
            closest.enemy = character
            closest.distance = distance
          }
        }
      }
      if (this.onAlert) {
        const alertDistance = getDistance(this.alertPoint, start)
        if (alertDistance < 45) {
          this.onAlert = false
          console.log('stop alert')
          this.updateSearchPosition()
        } else {
          this.searchPosition = this.alertPoint
        }
      }
      if (closest.enemy == null) {
        const goal = this.onAlert ? this.alertPoint : this.searchPosition
        const target = this.isPointClear(goal) ? goal : this.getGoalTarget(goal)
        return new Direction({ start: start, end: target, debugColor: 'white' })
      } else {
        const goal = closest.enemy.feature.body.position
        const target = this.isPointClear(goal) ? goal : this.getGoalTarget(goal)
        const debugColor = this.onAlert ? 'red' : 'grey'
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
        if (this.unblocking && distance < 150) {
          this.unblocking = false
          console.log('stop unblocking')
          this.updateSearchPosition()
        }
        if (blocked || this.unblocking) {
          this.unblocking = true
        } else {
          return new Direction({ start: itPos, end: start, debugColor: 'orange' })
        }
      } else {
        this.unblocking = false
      }
      return new Direction({ start: start, end: this.searchPosition, debugColor: 'teal' })
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
