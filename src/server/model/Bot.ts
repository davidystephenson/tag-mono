import Matter from 'matter-js'
import Character from './Character'
import { getRadiansInput as getRadiansControls } from '../lib/radians'
import Controls, { STILL } from '../../shared/controls'
import isClear, { raycast } from '../lib/raycast'
import Wall from './Wall'
import DebugLine from '../../shared/DebugLine'
import Waypoint from './Waypoint'
import DebugCircle from '../../shared/DebugCircle'
import VISION from '../../shared/VISION'
import { getDist, vectorToPoint } from '../lib/engine'

export default class Bot extends Character {
  static oldest: Bot
  static bots = new Map<number, Bot>()
  alertPoint: Matter.Vector
  onAlert: boolean = false
  unblocking: boolean = true
  searchArray: Matter.Vector[] = []
  searchIndex = 1
  searchPos: Matter.Vector

  constructor ({ x = 0, y = 0, radius = 15, color = 'green' }: {
    x: number
    y: number
    color?: string
    radius?: number
  }) {
    super({ x, y, color, radius })
    this.alertPoint = { x, y }
    this.searchPos = Waypoint.waypoints[0].position
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

  isPointClear (point: Matter.Vector): boolean {
    return isClear({
      start: this.feature.body.position,
      end: point,
      obstacles: Wall.wallObstacles
    })
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
      return this.isPointVisible(waypoint.position)
    })
    const distances = visibleFromStart.map(visibleWaypoint => {
      const startToWaypoint = getDist(visibleWaypoint.position, start)
      const waypointToGoal = visibleWaypoint.getDistance(goal)
      return startToWaypoint + waypointToGoal
    })
    return visibleFromStart[distances.indexOf(Math.min(...distances))]
  }

  getGoalTarget (goal: Matter.Vector): Matter.Vector {
    const start = this.feature.body.position
    const goalWaypoint = this.getGoalWaypoint(goal)
    const path = goalWaypoint.getVectorPath(goal)
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

  getVisibleCharacers (): Character[] {
    const characters = Character.characters.values()
    const visibleCharacters = []
    for (const character of characters) {
      const isVisible = this.isPointVisible(character.feature.body.position)
      if (isVisible) visibleCharacters.push(character)
    }
    return visibleCharacters
  }

  updateSearchPos (): void {
    this.searchPos = this.searchArray[this.searchIndex]
    this.searchIndex = (this.searchIndex + 1) % this.searchArray.length
  }

  choose (): Partial<Controls> {
    const start = this.feature.body.position
    const debugColor = Character.it === this ? 'red' : 'white'
    void new DebugCircle({ x: start.x, y: start.y, radius: 10, color: debugColor })
    const visibleCharacters = this.getVisibleCharacers()
    if (this.isPointVisible(this.searchPos)) this.updateSearchPos()
    if (Character.it === this) {
      const closest: { distance: number, enemy?: Character } = { distance: Infinity }
      for (const character of visibleCharacters) {
        if (character !== this) {
          const distance = getDist(start, character.feature.body.position)
          if (distance < closest.distance) {
            this.alertPoint = vectorToPoint(character.feature.body.position)
            this.onAlert = true
            closest.enemy = character
            closest.distance = distance
          }
        }
      }
      const alertDistance = getDist(this.alertPoint, start)
      if (alertDistance < 45) this.onAlert = false
      if (this.onAlert) this.searchPos = this.alertPoint
      const goal = closest.enemy != null ? closest.enemy.feature.body.position : this.searchPos
      const target = this.isPointVisible(goal) ? goal : this.getGoalTarget(goal)
      void new DebugLine({ start, end: target, color: 'red' })
      const radians = Matter.Vector.angle(start, target)
      const controls = getRadiansControls(radians)
      return controls
    } else if (Character.it != null) {
      const itPos = Character.it.feature.body.position
      const itVisible = this.isPointVisible(itPos)
      if (itVisible) {
        const vector = Matter.Vector.sub(start, itPos)
        const distance = Matter.Vector.magnitude(vector)
        const direction = Matter.Vector.normalise(vector)
        const checkPoint = Matter.Vector.add(start, Matter.Vector.mult(direction, 16))
        const blocked = Matter.Query.point(Wall.wallObstacles, checkPoint).length > 0
        if (distance < 150) {
          this.unblocking = false
          this.searchPos = this.searchArray[this.searchIndex]
          this.searchIndex = (this.searchIndex + 1) % this.searchArray.length
        }
        if (blocked || this.unblocking) {
          this.unblocking = true
        } else {
          const radians = Matter.Vector.angle(itPos, start)
          this.updateSearchPos()
          return getRadiansControls(radians)
        }
      } else {
        this.unblocking = false
      }
      if (!this.isPointClear(this.searchPos)) this.updateSearchPos()
      void new DebugLine({ start, end: this.searchPos, color: 'orange' })
      const radians = Matter.Vector.angle(start, this.searchPos)
      const controls = getRadiansControls(radians)
      return controls
    }
    return STILL
  }

  act (): void {
    const choice = this.choose()
    this.takeInput(choice)
    super.act()
  }
}
