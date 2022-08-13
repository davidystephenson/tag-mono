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
import Feature from './Feature'
import { vectorToPoint } from '../lib/engine'

export default class Bot extends Character {
  static oldest: Bot
  static bots = new Map<number, Bot>()
  alertPosition: Matter.Vector
  alerted: boolean = false
  escaping: boolean = true
  caught: boolean = false
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
    this.alertPosition = { x, y }
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

  getGoalTarget (goal: Matter.Vector): Matter.Vector {
    const start = this.feature.body.position
    const visibleFromStart = Waypoint.waypoints.filter(waypoint => isClear({
      start: this.feature.body.position,
      end: waypoint.position,
      obstacles: Wall.wallObstacles
    }))
    const distances = visibleFromStart.map(visibleWaypoint => {
      const vector = Matter.Vector.sub(visibleWaypoint.position, start)
      const startToWaypoint = Matter.Vector.magnitude(vector)
      const waypointToGoal = visibleWaypoint.getDistance(goal)
      return startToWaypoint + waypointToGoal
    })
    const targetWaypoint = visibleFromStart[distances.indexOf(Math.min(...distances))]
    const path = targetWaypoint.getVectorPath(goal)
    path.slice(0, path.length - 1).forEach((point, index) => {
      const next = path[index + 1]
      return new DebugLine({ start: point, end: next, color: 'blue' })
    })
    const target = path.reduce((a, b) => {
      const hit = raycast({ start, end: b, obstacles: Wall.wallObstacles })
      return hit === false ? b : a
    })
    void new DebugLine({ start, end: target, color: 'red' })
    return target
  }

  choose (): Partial<Controls> {
    const characterFeatures: Feature[] = []
    for (const [,feature] of Feature.features) {
      if (feature.body.label === 'character') characterFeatures.push(feature)
    }
    const obstacles = Array.from(Feature.obstacles.values())
    const visibleCharacterFeatures: Feature[] = []
    characterFeatures.forEach(feature => {
      const arrow = Matter.Vector.sub(feature.body.position, this.feature.body.position)
      const direction = Matter.Vector.normalise(arrow)
      const perp = Matter.Vector.perp(direction)
      const startPerp = Matter.Vector.mult(perp, this.radius)
      const leftSide = Matter.Vector.add(this.feature.body.position, startPerp)
      const rightSide = Matter.Vector.sub(this.feature.body.position, startPerp)
      const viewpoints = [this.feature.body.position, leftSide, rightSide]
      const isVisible = feature.isVisible({ center: this.feature.body.position, viewpoints, obstacles })
      if (isVisible) visibleCharacterFeatures.push(feature)
    })
    const visibleCharacters = visibleCharacterFeatures.map(feature => {
      return feature.actor as Character
    })
    const start = this.feature.body.position
    const visibleX = start.x - VISION.width < this.searchPos.x && this.searchPos.x < start.x + VISION.width
    const visibleY = start.y - VISION.height < this.searchPos.y && this.searchPos.y < start.y + VISION.height
    const clearSearchPos = isClear({ start, end: this.searchPos, obstacles: Wall.wallObstacles })
    if (visibleX && visibleY && clearSearchPos) {
      this.searchPos = this.searchArray[this.searchIndex]
      this.searchIndex = (this.searchIndex + 1) % this.searchArray.length
    }
    if (Character.it === this) {
      const closest: { distance: number, enemy?: Character } = { distance: Infinity }
      for (const character of visibleCharacters) {
        if (character !== this) {
          const distance = Matter.Vector.sub(character.feature.body.position, this.feature.body.position)
          const magnitude = Matter.Vector.magnitude(distance)
          if (magnitude < closest.distance) {
            this.alertPosition = vectorToPoint(character.feature.body.position)
            this.alerted = true
            closest.enemy = character
            closest.distance = magnitude
          }
        }
      }
      const alertVector = Matter.Vector.sub(this.alertPosition, start)
      const alertDistance = Matter.Vector.magnitude(alertVector)
      if (alertDistance < 45) this.alerted = false
      if (this.alerted) this.searchPos = this.alertPosition
      const goal = closest.enemy != null ? closest.enemy.feature.body.position : this.searchPos
      const target = this.getGoalTarget(goal)
      const radians = Matter.Vector.angle(start, target)
      const controls = getRadiansControls(radians)
      return controls
    } else if (Character.it != null) {
      const itPos = Character.it.feature.body.position
      const visibleX = start.x - VISION.width < itPos.x && itPos.x < start.x + VISION.width
      const visibleY = start.y - VISION.height < itPos.y && itPos.y < start.y + VISION.height
      const clearSearchPos = isClear({ start, end: itPos, obstacles: Wall.wallObstacles })
      const itVisible = visibleX && visibleY && clearSearchPos
      if (itVisible) {
        const vector = Matter.Vector.sub(start, itPos)
        const distance = Matter.Vector.magnitude(vector)
        const itClose = distance < 100
        if (itClose) {
          if (!this.caught) {
            this.escaping = false
            this.searchPos = this.searchArray[this.searchIndex]
            this.searchIndex = (this.searchIndex + 1) % this.searchArray.length
          }
          this.caught = true
        } else {
          this.caught = false
        }
        const direction = Matter.Vector.normalise(vector)
        const checkPoint = Matter.Vector.add(start, Matter.Vector.mult(direction, 30))
        const blocked = Matter.Query.point(Wall.wallObstacles, checkPoint).length > 0
        if (blocked || this.escaping) {
          this.escaping = true
        } else {
          const radians = Matter.Vector.angle(itPos, start)
          this.searchPos = this.searchArray[this.searchIndex]
          this.searchIndex = (this.searchIndex + 1) % this.searchArray.length
          return getRadiansControls(radians)
        }
      } else {
        this.escaping = false
      }
      const target = this.getGoalTarget(this.searchPos)
      const radians = Matter.Vector.angle(start, target)
      const controls = getRadiansControls(radians)
      return controls
    }

    void new DebugCircle({ x: start.x, y: start.y, radius: 10, color: 'white' })
    return STILL
  }

  act (): void {
    const choice = this.choose()
    this.takeInput(choice)
    super.act()
  }
}
