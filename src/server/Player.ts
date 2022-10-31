import Matter from 'matter-js'
import Bot from './Bot'
import Character from './Character'
import Stage from './Stage'

interface Goal {
  number: number
  passed: boolean
  position: Matter.Vector
  scored: boolean
}

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
        this.setGoal()
      } else {
        this.goals.forEach((goal, index) => {
          if (goal.scored) return
          const limit = this.feature.getRadius() + 15
          const close = this.isPointClose({ point: goal.position, limit })
          if (close) {
            this.score = this.score + 1
            goal.number = this.score
            goal.scored = true
            if (this.stage.scoreSpawn) {
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
          console.log('highest test:', highest)
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
      console.log('player position', this.feature.body.position)
    }
    if (this.stage.debugSpeed) {
      console.log('player speed', this.feature.body.speed)
    }
  }

  makeIt ({ oldIt }: { oldIt?: Character }): void {
    super.makeIt({ oldIt })
    this.setGoal()
  }

  setGoal (): void {
    const point = this.getExplorePoint({ debug: false })
    if (point == null) {
      throw new Error('Can not set goal')
    }
    this.goals.forEach(goal => { goal.passed = false })
    const oldGoal = this.goals.find(oldGoal => oldGoal.position.x === point.x && oldGoal.position.y === point.y)
    if (oldGoal == null) {
      const newGoal = { position: point, passed: false, scored: false, number: 0 }
      this.goals.push(newGoal)
      this.goalTime = Date.now()
    } else {
      oldGoal.passed = true
    }
  }
}
