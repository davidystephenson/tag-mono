import Matter, { Vector } from 'matter-js'
import { MARGIN } from '../lib/world'
import Character from './Character'
import Wall from './Wall'

export default class Waypoint {
  static waypoints: Waypoint[] = []
  static positions: Vector[] = []
  static label = 0
  static ids: number[] = []
  readonly x: number
  readonly y: number
  readonly position: Matter.Vector
  readonly id: number
  neighbors: Waypoint[] = []
  distances: number[] = []
  paths: Vector[][] = []

  constructor ({ x, y }: {
    x: number
    y: number
  }) {
    this.x = x
    this.y = y
    this.position = { x, y }
    this.id = Waypoint.waypoints.length
    Waypoint.label = Waypoint.label + 1
    const obstacle = Wall.walls.find(wall => {
      const dX = Math.abs(this.x - wall.x)
      const dY = Math.abs(this.y - wall.y)
      const overX = dX > wall.halfWidth
      const overY = dY > wall.halfHeight
      if (overX && overY) {
        const isLeft = this.x < wall.x
        const isTop = this.y < wall.y
        if (isLeft && isTop) {
          const cornerX = wall.x - wall.halfWidth
          const cornerY = wall.y - wall.halfHeight
          const cornerPosition = { x: cornerX, y: cornerY }
          const cornerVector = Matter.Vector.sub(cornerPosition, this.position)
          const cornerMagnitude = Matter.Vector.magnitude(cornerVector)
          if (cornerMagnitude < MARGIN - 1) {
            return true
          }
        }
        if (isLeft && !isTop) {
          const cornerX = wall.x - wall.halfWidth
          const cornerY = wall.y + wall.halfHeight
          const cornerPosition = { x: cornerX, y: cornerY }
          const cornerVector = Matter.Vector.sub(cornerPosition, this.position)
          const cornerMagnitude = Matter.Vector.magnitude(cornerVector)
          if (cornerMagnitude < MARGIN - 1) {
            return true
          }
        }
        if (!isLeft && isTop) {
          const cornerX = wall.x + wall.halfWidth
          const cornerY = wall.y - wall.halfHeight
          const cornerPosition = { x: cornerX, y: cornerY }
          const cornerVector = Matter.Vector.sub(cornerPosition, this.position)
          const cornerMagnitude = Matter.Vector.magnitude(cornerVector)
          if (cornerMagnitude < MARGIN - 1) {
            return true
          }
        }
        if (!isLeft && !isTop) {
          const cornerX = wall.x + wall.halfWidth
          const cornerY = wall.y + wall.halfHeight
          const cornerPosition = { x: cornerX, y: cornerY }
          const cornerVector = Matter.Vector.sub(cornerPosition, this.position)
          const cornerMagnitude = Matter.Vector.magnitude(cornerVector)
          if (cornerMagnitude < MARGIN - 1) {
            return true
          }
        }
      } else {
        const xBuffer = wall.halfWidth + MARGIN - 1
        const yBuffer = wall.halfHeight + MARGIN - 1
        if (dX < xBuffer && dY < yBuffer) {
          return true
        }
      }

      return false
    })
    if (obstacle == null) {
      Waypoint.waypoints.push(this)
      Waypoint.positions.push(this.position)
      Waypoint.ids.push(this.id)
    }
  }

  setNeighbors (): void {
    this.neighbors = Waypoint.waypoints.filter(other => {
      if (other.id === this.id) return false
      return Wall.isPointOpen({
        start: this.position,
        end: other.position,
        radius: Character.MAXIMUM_RADIUS
      })
    })
    this.neighbors.forEach(neighbor => {
      const vector = Matter.Vector.sub(neighbor.position, this.position)
      this.distances[neighbor.id] = Matter.Vector.magnitude(vector)
    })
  }

  updateDistances (): void {
    this.distances[this.id] = 0
    Waypoint.waypoints.forEach(goal => {
      this.neighbors.forEach(neighbor => {
        const oldDistance = this.distances[goal.id]
        const newDistance = this.distances[neighbor.id] + neighbor.distances[goal.id]
        this.distances[goal.id] = Math.min(oldDistance, newDistance)
      })
    })
  }

  setPaths (): void {
    this.paths[this.id] = [this.position]
    Waypoint.waypoints.forEach(other => {
      if (other.id !== this.id) {
        // console.log('setting path from', this.id, 'to', other.id)
        const waypointPath = this.getWaypointPath(other)
        const vectorPath = waypointPath.map(waypoint => waypoint.position)
        this.paths[other.id] = vectorPath
      }
    })
  }

  getWaypointPath (goal: Waypoint): Waypoint[] {
    const path: Waypoint[] = [this]
    let pathComplete = false
    while (!pathComplete) {
      const currentPoint = path[path.length - 1]
      const clear = Wall.isPointOpen({
        start: currentPoint.position,
        end: goal.position,
        radius: Character.MAXIMUM_RADIUS
      })
      if (clear) pathComplete = true
      else {
        const neighborToGoal = currentPoint.neighbors.map(neighbor => neighbor.distances[goal.id])
        const currentToNeighbor = currentPoint.neighbors.map(neighbor => currentPoint.distances[neighbor.id])
        const totalDistances = neighborToGoal.map((d, i) => neighborToGoal[i] + currentToNeighbor[i])
        const closest = currentPoint.neighbors[totalDistances.indexOf(Math.min(...totalDistances))]
        path.push(closest)
      }
    }
    path.push(goal)
    return path
  }
}
