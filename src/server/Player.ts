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
    blue = Character.NOT_IT_COLOR.blue,
    green = Character.NOT_IT_COLOR.green,
    id,
    observer = false,
    radius = 15,
    red = Character.NOT_IT_COLOR.red,
    stage,
    x = 0,
    y = 0
  }: {
    blue?: number
    green?: number
    id: string
    observer?: boolean
    radius?: number
    red?: number
    stage: Stage
    x: number
    y: number
  }) {
    super({ blue, green, radius, red, stage, x, y })
    this.observer = observer
    if (this.observer) {
      this.ready = false
      this.feature.setColor(Character.OBSERVER_COLOR)
    }
    this.id = id
    Player.players.set(this.id, this)
    this.isPlayer = true
  }

  act (): void {
    super.act()
    if (!this.isIt()) {
      if (this.goals.length === 0 || this.goalTime == null) {
        this.setGoal()
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
            this.setGoal()
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
          this.goals = [highest]
          this.initializeHeadings()
          this.setGoal()
        }

        const now = Date.now()
        const goalDifference = now - this.goalTime
        const spawnLimit = this.stage.getSpawnLimit()
        const goalLimit = 10000 - spawnLimit
        const limited = Math.max(goalLimit, 5000)
        if (goalDifference > limited) {
          this.setGoal()
        }
      }
    }
    if (this.stage.debugPosition) {
      console.debug('player position', this.feature.body.position)
    }
    if (this.stage.debugSpeed) {
      console.debug('player speed', this.feature.body.speed)
    }
  }

  makeIt ({ oldIt }: { oldIt?: Character }): void {
    super.makeIt({ oldIt })
    this.setGoal()
  }

  setGoal (): void {
    const heading = this.getExploreHeading({ debug: false, goals: this.goals })
    if (heading == null) {
      throw new Error('Can not set goal')
    }
    const closeGoal = this.goals.find(goal => {
      const xDifference = Math.abs(goal.heading.waypoint.position.x - heading.waypoint.position.x)
      const yDifference = Math.abs(goal.heading.waypoint.position.y - heading.waypoint.position.y)
      const xClose = xDifference < 5
      const yClose = yDifference < 5
      return xClose && yClose
    })
    if (closeGoal == null) {
      const newGoal = { heading, passed: false, scored: false, number: 0 }
      this.goals.push(newGoal)
      this.goalTime = Date.now()
    }
  }
}
