import Matter, { Vector } from 'matter-js'
import Stage from './Stage'

export default class Waypoint {
  distances: number[] = []
  readonly id: number
  neighbors: Waypoint[] = []
  readonly paths: Vector[][] = []
  readonly position: Matter.Vector
  readonly radius: number
  readonly stage: Stage
  readonly x: number
  readonly y: number
  constructor ({ radius, stage, x, y }: {
    radius: number
    stage: Stage
    x: number
    y: number
  }) {
    this.radius = radius
    this.stage = stage
    this.x = x
    this.y = y
    this.position = { x, y }
    this.id = this.stage.waypointGroups[radius].length
    const blockingWall = this.stage.walls.find(wall => {
      const dX = Math.abs(this.x - wall.x)
      const dY = Math.abs(this.y - wall.y)
      const coveredX = dX < wall.halfWidth + radius + 1
      const coveredY = dY < wall.halfHeight + radius + 1
      const covered = coveredX && coveredY
      return covered
    })
    if (blockingWall == null) {
      this.stage.waypointGroups[radius].push(this)
    }
  }

  isPointWallOpen ({ start, end }: {
    start: Matter.Vector
    end: Matter.Vector
  }): boolean {
    return this.stage.raycast.isPointOpen({
      start,
      end,
      radius: this.radius,
      obstacles: this.stage.wallBodies
    })
  }

  setNeighbors (): void {
    this.neighbors = this.stage.waypointGroups[this.radius].filter(other => {
      if (other.id === this.id) return false
      return this.isPointWallOpen({
        start: this.position,
        end: other.position
      })
    })
    this.neighbors.forEach(neighbor => {
      const vector = Matter.Vector.sub(neighbor.position, this.position)
      this.distances[neighbor.id] = Matter.Vector.magnitude(vector)
    })
  }

  updateDistances (): void {
    this.distances[this.id] = 0
    this.stage.waypointGroups[this.radius].forEach(goal => {
      this.neighbors.forEach(neighbor => {
        const oldDistance = this.distances[goal.id]
        const newDistance = this.distances[neighbor.id] + neighbor.distances[goal.id]
        this.distances[goal.id] = Math.min(oldDistance, newDistance)
      })
    })
  }

  setPaths (): void {
    this.paths[this.id] = [this.position]
    this.stage.waypointGroups[this.radius].forEach(other => {
      if (other.id !== this.id) {
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
      const index = path.length - 1
      const currentPoint = path[index]
      if (path.length > this.stage.waypointGroups[this.radius].length) throw new Error('Path is too long')
      const clear = this.isPointWallOpen({
        start: currentPoint.position,
        end: goal.position
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
