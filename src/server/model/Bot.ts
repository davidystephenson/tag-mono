import Matter from 'matter-js'
import Character from './Character'
import { getRadiansInput as getRadiansControls } from '../lib/radians'
import Controls, { STILL } from '../../shared/controls'
import isClear, { raycast } from '../lib/raycast'
import Wall from './Wall'
import DebugLine from '../../shared/DebugLine'
import Waypoint from './Waypoint'
import VISION from '../../shared/VISION'

export default class Bot extends Character {
  static oldest: Bot
  static bots = new Map<number, Bot>()

  constructor ({ x = 0, y = 0, radius = 15, color = 'green' }: {
    x: number
    y: number
    color?: string
    radius?: number
  }) {
    super({ x, y, color, radius })
    if (typeof (Bot.oldest) === 'undefined') Bot.oldest = this
  }

  takeInput (controls: Partial<Controls>): void {
    this.controls = { ...this.controls, ...controls }
  }

  choose (): Partial<Controls> {
    /*
    const itVisible = false
    const visibleFeatures = this.getVisibleFeatures()
    const visibleCharacterFeatures = visibleFeatures.filter(feature => feature.body.label === 'character')
    const visibleCharacters = visibleCharacterFeatures.map(feature => {
      if (feature.actor === Character.it) itVisible = true
      return feature.actor as Character
    })
    */
    const start = this.feature.body.position
    if (Character.it === this) {
      const closest: { distance: number, enemy?: Character } = { distance: Infinity }
      /*
      for (const character of visibleCharacters) {
        if (character !== this) {
          const distance = Matter.Vector.sub(character.feature.body.position, this.feature.body.position)
          const magnitude = Matter.Vector.magnitude(distance)

          if (magnitude < closest.distance) {
            closest.enemy = character
            closest.distance = magnitude
          }
        }
      }
      */
      for (const [,character] of Character.characters) {
        if (character !== this) closest.enemy = character
      }
      if (closest.enemy != null) {
        const goal = closest.enemy.feature.body.position
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
        const target = path.reduce((a, b) => {
          return isClear({ start, end: b, obstacles: Wall.wallObstacles }) ? b : a
        })
        path.slice(0, path.length - 1).forEach((point, index) => {
          const next = path[index + 1]
          return new DebugLine({ start: point, end: next, color: 'blue' })
        })
        void new DebugLine({ start, end: target, color: 'red' })
        const radians = Matter.Vector.angle(start, target)
        const controls = getRadiansControls(radians)
        return controls
      }
    } else if (Character.it != null) {
      const radians = Matter.Vector.angle(Character.it.feature.body.position, start)
      const controls = getRadiansControls(radians)
      raycast({
        start: this.feature.body.position,
        end: Character.it.feature.body.position,
        obstacles: Wall.wallObstacles
      })
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
