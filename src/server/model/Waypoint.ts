import Matter, { Vector } from 'matter-js'
import isClear from '../lib/isClear'
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
  readonly label: number
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
    this.label = Waypoint.label
    Waypoint.label = Waypoint.label + 1
    const obstacle = Wall.walls.find(wall => {
      const x = Math.abs(this.x - wall.x)
      const y = Math.abs(this.y - wall.y)
      const overX = x > wall.halfWidth
      const overY = y > wall.halfHeight

      if (overX && overY) {
        const wallPosition = { x: wall.x, y: wall.y }
        const wallVector = Matter.Vector.sub(wallPosition, this.position)
        const wallMagnitude = Matter.Vector.magnitude(wallVector)
        if (wallMagnitude < Wall.BUFFER) {
          return true
        }
      } else {
        const xBuffer = wall.halfWidth + Wall.BUFFER - 1
        const yBuffer = wall.halfHeight + Wall.BUFFER - 1
        if (x < xBuffer && y < yBuffer) {
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
      return isClear({
        start: this.position,
        end: other.position,
        obstacles: Wall.wallObstacles
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
      const clear = isClear({
        start: currentPoint.position,
        end: goal.position,
        obstacles: Wall.wallObstacles
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
