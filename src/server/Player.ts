import Matter from 'matter-js'
import Bot from './Bot'
import Character from './Character'
import Stage from './Stage'

interface Goal {
  position: Matter.Vector
  scored: boolean
}

export default class Player extends Character {
  static players = new Map<string, Player>()

  readonly id: string
  goals = new Array<Goal>()
  goalTime?: number
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
            goal.scored = true
            void new Bot({ stage: this.stage, x: 0, y: 0 })
            this.setGoal()
          }
        })
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
    const goal = this.getExplorePoint({ debug: false })
    if (goal == null) {
      throw new Error('Can not set goal')
    }
    const oldGoal = this.goals.find(oldGoal => oldGoal.position.x === goal.x && oldGoal.position.y === goal.y)
    if (oldGoal == null) {
      this.goals.push({ position: goal, scored: false })
      this.goalTime = Date.now()
    } else {
      this.stage.circle({ color: 'orange', radius: 5, x: goal.x, y: goal.y })
    }
  }
}
