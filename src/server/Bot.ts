import Matter from 'matter-js'
import Character from './Character'
import Player from './Player'
import Stage from './Stage'
import Controls, { getRadiansControls, STILL } from '../shared/controls'
import { vectorToPoint } from '../shared/math'
import { getDistance, whichMin, getAngle, getAngleDifference, whichMax } from './math'
import Scenery from './Scenery'

export interface Profile {
  character: Character
  distance: number
}

export default class Bot extends Character {
  static pathLabels = ['reset', 'unblock', 'pursue', 'flee', 'wander', 'explore', 'lost'] as const
  static TIME_LIMIT = 5000

  path: Matter.Vector[] = []
  pathTime?: number
  pathLabel?: typeof Bot.pathLabels[number]
  unblockTries?: Record<number, boolean>
  constructor ({ radius = 15, stage, x = 0, y = 0 }: {
    radius?: number
    stage: Stage
    x: number
    y: number
  }) {
    super({ x, y, radius, stage })
    this.stage.botCount = this.stage.botCount + 1
    if (this.stage.oldest == null) this.stage.oldest = this
    this.loseReady({})
  }

  act (): void {
    const choice = this.chooseControls()
    this.takeInput(choice)
    super.act()
  }

  chooseControls (): Partial<Controls> {
    const target = this.chooseDirection()
    if (target == null) {
      return STILL
    }
    const radians = Matter.Vector.angle(this.feature.body.position, target)
    const controls = getRadiansControls(radians)
    return controls
  }

  chooseDirection (): Matter.Vector | null {
    if (this.stage.it == null) {
      console.warn('No it')
      return null
    }
    const isIt = this.stage.it === this
    const profiles: Profile[] = []
    this.stage.characters.forEach(character => {
      if (character === this) return
      if (!isIt) {
        if (this.stage.it !== character || !character.ready) return
      }
      const distance = this.getDistance(character.feature.body.position)
      profiles.push({ character, distance })
    })
    profiles.sort((a, b) => a.distance - b.distance)
    const enemy = profiles.find(profile => {
      const isVisible = this.isFeatureVisible(profile.character.feature)
      return isVisible
    })?.character

    if (enemy != null) {
      if (isIt) {
        this.blocked = this.isBlocked({ character: enemy })
        const trapped = this.blocked && this.isBored()
        if (trapped) {
          return this.unblock({ character: enemy })
        }
        if (this.pathLabel !== 'unblock') {
          return this.flee({ character: enemy })
        }
      } else {
        const point = vectorToPoint(enemy.feature.body.position)
        this.setPath({ path: [point], label: 'pursue' })
        return point
      }
    } else if (isIt) {
      this.blocked = false
      this.unblockTries = undefined
    }
    if (this.isBored()) {
      return this.explore()
    }
    const debug = isIt ? this.stage.debugItChoice : this.stage.debugNotItChoice
    return this.followPath(debug)
  }

  explore (debug = this.stage.debugWander): Matter.Vector | null {
    const explorePoint = this.getExplorePoint({ debug })
    if (explorePoint == null) return this.loseWay()
    this.setPath({ path: [explorePoint], label: 'explore' })
    return this.path[0]
  }

  findPath ({ goal }: {
    goal: Matter.Vector
  }): Matter.Vector | null {
    const goalPoint = vectorToPoint(goal)
    if (this.isPointReachable({ point: goalPoint })) {
      this.path = [goalPoint]
      return goalPoint
    }
    const group = this.getGroup()
    const visibleFromStart = this.stage.waypointGroups[group].filter(waypoint => {
      return this.isPointReachable({ point: waypoint.position })
    })
    if (visibleFromStart.length === 0) {
      if (this.stage.debugLost) {
        console.warn('Invisible path start')
      }
      return this.loseWay()
    }

    const visibleFromEnd = this.stage.waypointGroups[group].filter(waypoint => {
      return this.stage.raycast.isPointOpen({
        start: waypoint.position,
        end: goalPoint,
        radius: this.feature.getRadius(),
        obstacles: this.stage.wallBodies
      })
    })
    if (visibleFromEnd.length === 0) {
      if (this.stage.debugLost) {
        console.warn('Invisible path goal')
      }
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

  flee ({ character }: { character: Character }): Matter.Vector {
    this.setPath({ path: [], label: 'flee' })
    const start = this.feature.body.position
    const product = Matter.Vector.mult(character.feature.body.velocity, 10)
    const avoidPosition = Matter.Vector.add(character.feature.body.position, product)
    const avoidDirection = Matter.Vector.sub(start, avoidPosition)
    const toPoint = Matter.Vector.add(start, avoidDirection)
    return toPoint
  }

  followPath (debug?: boolean): Matter.Vector | null {
    const debugging = debug === true || this.stage.debugPathing
    if (debugging) {
      const originIndex = this.path.length - 1
      this.path.slice(0, originIndex).forEach((point, i) => {
        this.stage.line({
          color: 'purple', start: point, end: this.path[i + 1]
        })
      })
      this.stage.circle({
        color: 'purple', radius: 5, x: this.path[0].x, y: this.path[0].y
      })
    }
    const target = this.path.find(point => this.isPointReachable({ point }))
    if (target == null) {
      const target = this.findPath({ goal: this.path[0] })
      if (target == null) return this.loseWay()
      return target
    } else {
      return target
    }
  }

  isBored (): boolean {
    const stuck = this.isStuck()
    const confused = this.path.length === 0
    const arriving = !confused && this.isPointClose({ point: this.path[0], limit: 15 })

    return stuck || confused || arriving
  }

  isBlocked ({ character }: { character: Character }): boolean {
    if (character == null) {
      return false
    }
    const vector = Matter.Vector.sub(this.feature.body.position, character.feature.body.position)
    const direction = Matter.Vector.normalise(vector)
    const blockPoint = Matter.Vector.add(this.feature.body.position, Matter.Vector.mult(direction, 30))
    return !this.isPointWallOpen({ point: blockPoint, debug: this.stage.debugChase })
  }

  isPointReachable ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    const inRange = this.isPointInRange(point)
    if (!inRange) return false
    const clear = this.isPointWallOpen({ point, debug })
    return clear
  }

  isPointWallVisible ({ point, debug }: { point: Matter.Vector, debug?: boolean }): boolean {
    const inRange = this.isPointInRange(point)
    if (!inRange) return false
    const shown = this.isPointWallShown({ point, debug })
    return shown
  }

  isStuck (): boolean {
    if (this.pathTime == null) return false
    const difference = Date.now() - this.pathTime
    return difference > Bot.TIME_LIMIT
  }

  boxToTriangle ({ box, scale, sign }: {
    box: {
      center: Matter.Vector
      width: number
      height: number
    }
    scale: number
    sign: number
  }): Matter.Vector[] {
    console.log('boxToTriangle')
    const radius = this.feature.getRadius()
    const scaleHeight = box.height * scale
    const height = scaleHeight > radius * 2 ? scaleHeight : box.height
    const scaledWidth = box.width * scale
    const width = scaledWidth > radius * 2 ? scaledWidth : box.width
    const halfHeight = 0.5 * height
    const halfWidth = 0.5 * width
    const topRight = { x: halfWidth, y: -halfHeight }
    const botRight = { x: halfWidth, y: halfHeight }
    const topLeft = { x: -halfWidth, y: -halfHeight }
    const botLeft = { x: -halfWidth, y: halfHeight }
    const weight = 0.5
    console.log('sign', sign)
    if (sign > 0) {
      console.log('point left')
      const point = { x: halfWidth, y: weight * halfHeight - (1 - weight) * halfHeight }
      return [botLeft, topLeft, point]
    }
    console.log('point right')
    const point = { x: -halfWidth, y: weight * halfHeight - (1 - weight) * halfHeight }
    return [botRight, topRight, point]
  }

  loseIt ({ newIt }: { newIt: Character }): Scenery {
    this.unblockTries = undefined
    this.setPath({ path: [], label: 'reset' })
    return super.loseIt({ newIt })
  }

  loseWay (props?: { goal?: Matter.Vector }): null {
    if (this.stage.debugLost) {
      const position = props?.goal ?? this.feature.body.position
      const point = vectorToPoint(position)
      this.stage.lostPoints.push(point)
      console.warn(`Lost ${this.stage.lostPoints.length}:`, this.feature.body.id, Math.floor(point.x), Math.floor(point.y))
      Player.players.forEach(player => {
        this.stage.line({
          color: 'yellow',
          end: point,
          start: player.feature.body.position
        })
      })
    }
    this.setPath({ path: [], label: 'lost' })
    return null
  }

  makeIt ({ oldIt }: { oldIt: Character }): void {
    super.makeIt({ oldIt: oldIt })
    console.log('Bot.makeIt test')
    this.setPath({ path: [], label: 'reset' })
    this.blocked = false
  }

  setPath ({ path, label }: { path: Matter.Vector[], label: typeof Bot.pathLabels[number] }): void {
    this.path = path
    this.pathLabel = label
    this.pathTime = Date.now()
  }

  unblock ({ character }: { character: Character }): Matter.Vector | null {
    const group = this.getGroup()
    const eligible = this.stage.waypointGroups[group].filter(waypoint => {
      const tried = this.unblockTries?.[waypoint.id] === true
      if (tried) {
        return false
      }
      const reachable = this.isPointReachable({ point: waypoint.position })
      return reachable
    })
    if (eligible.length === 0) return this.loseWay()
    const far = eligible.filter(waypoint => !this.isPointClose({ point: waypoint.position, limit: 45 }))
    if (far.length === 0) return this.loseWay()
    const characterAngle = getAngle(this.feature.body.position, character.feature.body.position)
    const differences = far.map(waypoint => {
      const angle = getAngle(this.feature.body.position, waypoint.position)
      return getAngleDifference(angle, characterAngle)
    })
    const mostDifferent = whichMax(far, differences)
    if (this.unblockTries == null) this.unblockTries = {}
    this.unblockTries[mostDifferent.id] = true
    if (mostDifferent.position == null) {
      return this.loseWay()
    }
    this.setPath({ path: [mostDifferent.position], label: 'unblock' })
    return mostDifferent.position
  }

  takeInput (controls: Partial<Controls>): void {
    this.controls = { ...this.controls, ...controls }
  }
}
