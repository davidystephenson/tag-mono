import Matter from 'matter-js'
import isClear from '../lib/raycast'
import Wall from './Wall'

export default class Waypoint {
  static waypoints: Waypoint[] = []
  readonly x: number
  readonly y: number
  readonly position: Matter.Vector
  readonly id: number
  neighbors: Waypoint[] = []
  distances: number[] = []

  constructor ({ x, y }: {
    x: number
    y: number
  }) {
    this.x = x
    this.y = y
    this.position = { x, y }
    this.id = Waypoint.waypoints.length
    Waypoint.waypoints.push(this)
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

  getDistance (goal: Matter.Vector): number {
    const visibleFromGoal = Waypoint.waypoints.filter(waypoint => isClear({
      start: goal,
      end: waypoint.position,
      obstacles: Wall.wallObstacles
    }))
    const distances = visibleFromGoal.map(visbleWaypoint => {
      const vector = Matter.Vector.sub(goal, visbleWaypoint.position)
      return this.distances[visbleWaypoint.id] + Matter.Vector.magnitude(vector)
    })
    return Math.min(...distances)
  }

  getVectorPath (goal: Matter.Vector): Matter.Vector[] {
    const visibleFromGoal = Waypoint.waypoints.filter(waypoint => isClear({
      start: goal,
      end: waypoint.position,
      obstacles: Wall.wallObstacles
    }))
    const distances = visibleFromGoal.map(visbleWaypoint => {
      const vector = Matter.Vector.sub(goal, visbleWaypoint.position)
      return this.distances[visbleWaypoint.id] + Matter.Vector.magnitude(vector)
    })
    const finalWaypoint = visibleFromGoal[distances.indexOf(Math.min(...distances))]
    const waypointPath = this.getWaypointPath(finalWaypoint)
    const vectorPath = waypointPath.map(waypoint => waypoint.position)
    vectorPath.push(goal)
    return vectorPath
  }
}
