import Bot from './Bot'
import Character from './Character'
import Stage from './Stage'
import { Goal } from './types'

export default class Player extends Character {
  static players = new Map<string, Player>()

  readonly id: string
  goals = new Array<Goal>()
  goalTime?: number
  score = 0
  constructor ({
    id,
    observer = false,
    radius = 15,
    stage,
    x = 0,
    y = 0
  }: {
    id: string
    observer?: boolean
    radius?: number
    stage: Stage
    x: number
    y: number
  }) {
    super({ x, y, radius, stage })
    this.observer = observer
    if (this.observer) {
      this.ready = false
      this.feature.setColor({ red: 255, green: 255, blue: 255 })
    }
    this.id = id
    Player.players.set(this.id, this)
    this.isPlayer = true
  }

  act (): void {
    super.act()
    if (this.stage.it === this) {
      if (this.goals.length === 0 || this.goalTime == null) {
        this.setGoal({})
      } else {
        this.goals.forEach((goal, index) => {
          if (goal.scored) return
          const distance = goal.heading.tight ? 30 : 15
          const limit = this.feature.getRadius() + distance
          const close = this.isPointClose({ point: goal.heading.waypoint.position, limit })
          if (close) {
            const points = goal.heading.tight ? 5 : 1
            this.score = this.score + points
            goal.number = this.score
            goal.scored = true
            if (this.stage.spawnOnScore) {
              void new Bot({ stage: this.stage, x: 0, y: 0 })
            }
            this.setGoal({ scoring: true })
          }
        })
        const scores = this.goals.filter(goal => goal.scored)
        const waypointsLength = this.stage.waypointGroups[15].length
        if (scores.length > waypointsLength) {
          throw new Error('More scores than waypoints')
        }
        if (scores.length === waypointsLength) {
          const highest = scores.reduce((a, b) => {
            return a.number > b.number ? a : b
          })
          console.log('highest test:', highest)
          this.goals = [highest]
          this.initializeHeadings()
          this.setGoal({})
        }

        const now = Date.now()
        const goalDifference = now - this.goalTime
        const spawnLimit = this.stage.getSpawnLimit()
        const goalLimit = 10000 - spawnLimit
        const limited = Math.max(goalLimit, 5000)
        if (goalDifference > limited) {
          this.setGoal({ timed: true })
        }
      }
    }
    if (this.stage.debugPosition) {
      console.log('player position', this.feature.body.position)
    }
    if (this.stage.debugSpeed) {
      console.log('player speed', this.feature.body.speed)
    }
  }

  makeIt ({ oldIt }: { oldIt?: Character }): void {
    super.makeIt({ oldIt })
    this.setGoal({})
  }

  setGoal ({ scoring, timed }: { scoring?: boolean, timed?: boolean }): void {
    const goals = scoring === true ? this.goals : undefined
    const heading = this.getExploreHeading({ debug: false, goals })
    if (heading == null) {
      throw new Error('Can not set goal')
    }
    if (timed === true) {
      const oldGoal = this.goals.find(oldGoal =>
        oldGoal.heading.waypoint.position.x === heading.waypoint.position.x &&
        oldGoal.heading.waypoint.position.y === heading.waypoint.position.y
      )
      if (oldGoal == null) {
        const newGoal = { heading, passed: false, scored: false, number: 0 }
        this.goals.push(newGoal)
        this.goalTime = Date.now()
      }
    } else {
      this.goals = this.goals.filter(goal =>
        goal.heading.waypoint.position.x !== heading.waypoint.position.x ||
        goal.heading.waypoint.position.y !== heading.waypoint.position.y
      )
      const newGoal = { heading, passed: false, scored: false, number: 0 }
      this.goals.push(newGoal)
      this.goalTime = Date.now()
    }
  }
}
