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
    console.log(this.id, 'neighbors', this.neighbors.map(neighbor => neighbor.id))
    console.log(this.id, 'neighbor distances', this.neighbors.map(neighbor => this.distances[neighbor.id]))
  }

  updateDistances (): void {
    this.distances[this.id] = 0
    this.neighbors.forEach(neighbor => {
      neighbor.neighbors.forEach(next => {
        const oldDistance = this.distances[next.id]
        const newDistance = this.distances[neighbor.id] + neighbor.distances[next.id]
        this.distances[next.id] = Math.min(oldDistance, newDistance)
      })
    })
  }

  // 0 -> 3 -> 5 -> 13 - 14
  // 0 -> 3 : 42
  // 3 -> 5 : 230
  // 5 -> 13 : 965
  // 13 -> 14 : 42

  getPath (goal: Waypoint): Waypoint[] {
    const path: Waypoint[] = [this]
    let pathComplete = false
    let step = 0
    while (!pathComplete) {
      step = step + 1
      if (step > 3) pathComplete = true
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
        /*
        console.log('myDistance', currentPoint.distances[goal.id])
        console.log('neighborToGoal', neighborToGoal)
        console.log('currentToNeighbor', currentToNeighbor)
        console.log('totalDistances', totalDistances)
        console.log('neighborIds', currentPoint.neighbors.map(neighbor => neighbor.id))
        */
        path.push(closest)
      }
    }
    path.push(goal)
    /*
    console.log('0 -> 3', Waypoint.waypoints[0].distances[3])
    console.log('3 -> 5', Waypoint.waypoints[3].distances[5])
    console.log('5 -> 13', Waypoint.waypoints[5].distances[13])
    console.log('13 -> 14', Waypoint.waypoints[5].distances[14])
    console.log('0 -> 1', Waypoint.waypoints[0].distances[1])
    console.log('1 -> 14', Waypoint.waypoints[1].distances[14])
    console.log('13 neighbors', Waypoint.waypoints[13].neighbors.map(neighbor => neighbor.id))
    */
    // console.log('neighbor to 5', Waypoint.waypoints[5].neighbors.map(neighbor => neighbor.distances[5]))
    // console.log('neighbor to goal', Waypoint.waypoints[5].neighbors.map(neighbor => neighbor.distances[goal.id]))
    // Waypoint.waypoints.forEach(waypoint => console.log(waypoint.id, waypoint.distances[goal.id]))
    // console.log(path.map(waypoint => waypoint.position))
    return path
  }
}
