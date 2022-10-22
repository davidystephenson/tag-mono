import Matter from 'matter-js'
import Bot from './Bot'
import Character from './Character'
import Stage from './Stage'

export default class Player extends Character {
  static players = new Map<string, Player>()

  readonly id: string
  goals = new Array<Matter.Vector>()
  goalTime?: number
  readonly scores = new Array<Matter.Vector>()
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
        const indexes = new Array<Number>()
        this.goals.forEach((goal, index) => {
          const close = this.isPointClose({ point: goal, limit: 15 })
          if (close) {
            this.score = this.score + 1
            void new Bot({ stage: this.stage, x: 0, y: 0 })
            this.scores.push(goal)
            indexes.push(index)
          }
        })

        indexes.forEach(index => {
          this.goals = this.goals.filter((_, i) => i !== index)
          this.setGoal()
        })
        const now = Date.now()
        const goalDifference = now - this.goalTime
        const spawnLimit = this.stage.getSpawnLimit()
        const goalLimit = 5000 + spawnLimit
        if (goalDifference > goalLimit) {
          this.setGoal()
        }
      }
    }
    if (this.stage.debugOpenWaypoints) {
      const visible = this.stage.waypoints.filter(waypoint => {
        return this.isPointWallOpen({ point: waypoint.position })
      })
      visible.forEach(waypoint => {
        this.stage.line({
          color: 'black',
          end: waypoint.position,
          start: this.feature.body.position
        })
      })
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
    this.goals.push(goal)
    this.goalTime = Date.now()
    this.onTime = true
  }
}
