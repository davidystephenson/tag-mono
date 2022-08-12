import Matter from 'matter-js'
import Character from './Character'
import { getRadiansInput as getRadiansControls } from '../lib/radians'
import Controls, { STILL } from '../../shared/controls'
import isClear, { raycast } from '../lib/raycast'
import Wall from './Wall'
import DebugLine from '../../shared/DebugLine'

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
    if (Bot.bots.size === 1) Bot.oldest = this
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
        const path: Matter.Vector[] = []
        let pathComplete = false
        let endNode = start
        while (!pathComplete) {
          const hit = raycast({
            start: endNode,
            end: goal,
            obstacles: Wall.wallObstacles
          })
          if (hit !== false) {
            path.push(hit.entryPoint)
            const nodes = hit.hitBody.vertices.map(corner => {
              const direction = Matter.Vector.normalise({
                x: Math.sign(corner.x - hit.hitBody.position.x),
                y: Math.sign(corner.y - hit.hitBody.position.y)
              })
              const away = Matter.Vector.mult(direction, 16)
              return Matter.Vector.add(corner, away)
            })
            const visibleNodes = nodes.filter(node => isClear({
              start: hit.entryPoint,
              end: node,
              obstacles: Wall.wallObstacles
            }))
            const nearNode = visibleNodes.reduce((previous, current) => {
              const vector1 = Matter.Vector.sub(previous, goal)
              const dist1 = Matter.Vector.magnitude(vector1)
              const vector2 = Matter.Vector.sub(current, goal)
              const dist2 = Matter.Vector.magnitude(vector2)
              return dist2 < dist1 ? current : previous
            })
            path.push(nearNode)
            endNode = nearNode
            const endHit = raycast({
              start: endNode,
              end: goal,
              obstacles: Wall.wallObstacles
            })
            if (endHit === false) pathComplete = true
          } else {
            pathComplete = true
          }
        }
        path.push(goal)
        const target = path.reduce((target, node, index) => {
          void new DebugLine({ start: path[index - 1], end: path[index], color: 'blue' })
          if (isClear({ start, end: node, obstacles: Wall.wallObstacles })) {
            return node
          }
          return target
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
