import csvAppend from 'csv-append'
import Matter from 'matter-js'
import Controls from '../../shared/controls'
import Circle from '../../shared/Circle'
import Label from '../../shared/Label'
import Line from '../../shared/Line'
import Shape from '../../shared/Shape'
import { UpdateMessage } from '../../shared/socket'
import { VISION_INNER_HEIGHT, VISION_INNER_WIDTH } from '../../shared/VISION'
import { DEBUG } from '../lib/debug'
import { getRandomRectangleSize } from '../../shared/math'
import Raycast from './Raycast'
import Actor from './Actor'
import Bot from './Bot'
import Brick from './Brick'
import Character from './Character'
import Feature from './Feature'
import Player from './Player'
import Wall from './Wall'
import Waypoint from './Waypoint'

export default class Stage {
  activeCollisionCount = 0
  actors = new Map<number, Actor>()
  bodies: Matter.Body[] = []
  botCount = 0
  characters = new Map<number, Character>()
  characterBodies: Matter.Body[] = []
  circles: Circle[] = []
  collisionStartCount = 0
  engine = Matter.Engine.create()
  features = new Map<number, Feature>()
  initial = true
  it?: Character
  labels: Label[] = []
  lines: Line[] = []
  lostPoints: Matter.Vector[] = []
  oldest?: Bot
  oldTime = Date.now()
  paused = false
  raycast: Raycast
  runner = Matter.Runner.create()
  scenery: Matter.Body[] = []
  stepCount = 0
  timers = new Map<number, [number, () => void]>()
  totalBodyCount = 0
  totalCollisionCount = 0
  wallBodies: Matter.Body[] = []
  walls: Wall[] = []
  warningCount = 0
  warningDifferenceTotal = 0
  warningTime = Date.now()
  readonly warnings10: number[] = []
  waypoints: Waypoint[] = []
  xFactor = 2
  xSegment: number
  yFactor = 2
  ySegment: number
  constructor ({
    centerBot,
    cornerBots,
    country,
    countryBots,
    greek,
    greekBots,
    gridBots,
    midpointBots,
    size,
    town,
    townBots,
    waypointBots,
    waypointBricks,
    wildBricks
  }: {
    centerBot?: boolean
    cornerBots?: boolean
    country?: boolean
    countryBots?: boolean
    greek?: boolean
    greekBots?: boolean
    gridBots?: boolean
    midpointBots?: boolean
    size: number
    town?: boolean
    townBots?: boolean
    waypointBots?: boolean
    waypointBricks?: boolean
    wildBricks?: boolean
  }) {
    this.engine.gravity = { x: 0, y: 0, scale: 1 }
    this.raycast = new Raycast({ stage: this })
    const wallSize = size * 3
    const wallProps = [
      { x: 0, y: size, width: wallSize, height: size },
      { x: 0, y: -size, width: wallSize, height: size },
      { x: size, y: 0, width: size, height: wallSize },
      { x: -size, y: 0, width: size, height: wallSize }
    ]
    wallProps.forEach(props => new Wall({ ...props, waypoints: false, stage: this }))
    const halfSize = size / 2
    const marginEdge = halfSize - Character.MARGIN
    const townWalls: Wall[] = []
    if (town === true) {
      const PIT = new Wall({ x: 605, y: -955, width: 1700, height: 1000, stage: this })
      const BYTE = new Wall({ x: -500, y: -1300, width: 5, height: 5, stage: this })
      const PALACE = new Wall({ x: -1000, y: -1150, width: 600, height: 310, stage: this })
      const BIT = new Wall({ x: -500, y: -1100, width: 1, height: 1, stage: this })
      const FORT = new Wall({ x: -872.5, y: -900, width: 1165, height: 100, stage: this })
      const MANSION = new Wall({ x: -520, y: -700, width: 460, height: 210, stage: this })
      const KNIFE = new Wall({ x: -1244.75, y: -659, width: 420.5, height: 2, stage: this })
      const SCALPEL = new Wall({ x: -1244.75, y: -612.5, width: 420.5, height: 1, stage: this })
      const OUTPOST = new Wall({ x: -1244.75, y: -517, width: 420.5, height: 100, stage: this })
      const DAGGER = new Wall({ x: -988, y: -500, width: 3, height: 610, stage: this })
      const RAPIER = new Wall({ x: -941, y: -400, width: 1, height: 810, stage: this })
      const PRECINCT = new Wall({ x: -845, y: -500, width: 100, height: 610, stage: this })
      const BUTCHER = new Wall({ x: -700, y: -500, width: 100, height: 100, stage: this })
      const BAKER = new Wall({ x: -555, y: -500, width: 100, height: 100, stage: this })
      const CANDLESTICK = new Wall({ x: -375, y: -500, width: 170, height: 100, stage: this })
      const BAYONET = new Wall({ x: -1244.75, y: -419.5, width: 420.5, height: 5, stage: this })
      townWalls.push(PIT, BYTE, PALACE, BIT, FORT, MANSION, KNIFE, SCALPEL, OUTPOST, DAGGER, RAPIER, PRECINCT, BUTCHER, BAKER, CANDLESTICK, BAYONET)
    }

    const greekWalls: Wall[] = []
    if (greek === true) {
      const alpha = new Wall({ x: -1454.5, y: -755, width: 1, height: 100, stage: this })
      const beta = new Wall({ x: -1408.5, y: -755, width: 1, height: 100, stage: this })
      const gamma = new Wall({ x: -1363, y: -755, width: 1, height: 100, stage: this })
      const delta = new Wall({ x: -1317.5, y: -755, width: 1, height: 100, stage: this })
      const epsilon = new Wall({ x: -1272, y: -755, width: 1, height: 100, stage: this })
      const zeta = new Wall({ x: -1226.5, y: -755, width: 1, height: 100, stage: this })
      const eta = new Wall({ x: -1181, y: -755, width: 1, height: 100, stage: this })
      const theta = new Wall({ x: -1135.5, y: -755, width: 1, height: 100, stage: this })
      const iota = new Wall({ x: -1090, y: -755, width: 1, height: 100, stage: this })
      const kappa = new Wall({ x: -1039.275, y: -801, width: 9.45, height: 8, stage: this })
      const lamda = new Wall({ x: -1039.275, y: -751.5, width: 9.45, height: 1, stage: this })
      const mu = new Wall({ x: -1039.275, y: -705.5, width: 9.45, height: 1, stage: this })
      greekWalls.push(alpha, beta, gamma, delta, epsilon, zeta, eta, theta, iota, kappa, lamda, mu)
      townWalls.concat(greekWalls)
    }

    const countryWalls: Wall[] = []
    if (country === true) {
      countryWalls.push(
        new Wall({ x: -1100, y: 400, width: 200, height: 500, stage: this }),
        new Wall({ x: 0, y: -200, width: 100, height: 100, stage: this }),
        new Wall({ x: 1000, y: 200, width: 200, height: 1000, stage: this }),
        new Wall({ x: -400, y: 600, width: 1000, height: 1000, stage: this }),
        new Wall({ x: 450, y: 700, width: 100, height: 800, stage: this }),
        new Wall({ x: -800, y: 1300, width: 400, height: 200, stage: this }),
        new Wall({ x: 300, y: 1300, width: 800, height: 200, stage: this }),
        new Wall({ x: -1250, y: 1300, width: 200, height: 50, stage: this })
      )
    }
    const innerSize = size - Character.MARGIN * 2
    this.xFactor = 2
    this.xSegment = innerSize / this.xFactor
    while (this.xSegment > VISION_INNER_WIDTH) {
      this.xFactor = this.xFactor + 1
      this.xSegment = innerSize / this.xFactor
    }
    this.yFactor = 2
    this.ySegment = innerSize / this.yFactor
    while (this.ySegment > VISION_INNER_HEIGHT) {
      this.yFactor = this.yFactor + 1
      this.ySegment = innerSize / this.yFactor
    }
    const gridWaypoints: Waypoint[] = []
    for (let i = 0; i <= this.xFactor; i++) {
      for (let j = 0; j <= this.yFactor; j++) {
        const x = -innerSize / 2 + i * this.xSegment
        const y = -innerSize / 2 + j * this.ySegment

        gridWaypoints.push(new Waypoint({ stage: this, x, y }))
      }
    }
    console.log('begin navigation')
    this.waypoints.forEach(waypoint => { waypoint.distances = this.waypoints.map(() => Infinity) })
    console.log('setting neighbors...')
    this.waypoints.forEach(waypoint => waypoint.setNeighbors())
    console.log('updating distances...')
    this.waypoints.forEach(() => this.waypoints.forEach(waypoint => waypoint.updateDistances()))
    console.log('Wall.wall.length', this.walls.length)
    console.log('setting paths...')
    this.waypoints.forEach(waypoint => waypoint.setPaths())
    console.log('debugging waypoints...')
    this.waypoints.forEach(waypoint => {
      if (DEBUG.WAYPOINT_LABELS) {
        const y = DEBUG.WAYPOINT_CIRCLES ? waypoint.y + 20 : waypoint.y
        void new Label({
          color: 'white', stage: this, text: String(waypoint.id), x: waypoint.x, y
        })
      }
    })

    console.log('navigation complete')
    if (wildBricks === true) {
      this.randomBrick({ x: -30, y: -30, height: 30, width: 30 })
      this.randomBrick({ x: 30, y: -30, height: 30, width: 30 })
      this.randomBrick({ x: 0, y: -30, height: 30, width: 30 })
      this.randomBrick({ x: 0, y: -30, height: 30, width: 100 })
      this.randomBrick({ x: 30, y: 0, height: 30, width: 50 })
      this.randomBrick({ x: -30, y: 0, height: 50, width: 30 })
      this.randomBrick({ x: -800, y: 0, height: 80, width: 30 })
      this.randomBrick({ x: -900, y: 0, height: 50, width: 50 })
      this.randomBrick({ x: -1000, y: 0, height: 50, width: 50 })
      this.randomBrick({ x: -1100, y: 0, height: 90, width: 80 })
      this.randomBrick({ x: -1200, y: 0, height: 50, width: 50 })
      this.randomBrick({ x: -1300, y: 0, height: 50, width: 50 })
      this.randomBrick({ x: -1400, y: 0, height: 50, width: 50 })
      this.randomBrick({ x: 0, y: 30, height: 30, width: 30 })
      this.randomBrick({ x: 30, y: 30, height: 30, width: 30 })
      this.randomBrick({ x: -30, y: 30, height: 30, width: 30 })
      this.randomBrick({ x: 800, y: 200, height: 200, width: 100 })
      this.randomBrick({ x: -500, y: 1400, height: 100, width: 200 })
      this.randomBrick({ x: -1300, y: 1300, height: 200, width: 30 })
      this.randomBrick({ x: 750, y: 1300, height: 200, width: 30 })
      this.randomBrick({ x: 800, y: 1300, height: 200, width: 30 })
      this.randomBrick({ x: 850, y: 1300, height: 200, width: 30 })
      this.randomBrick({ x: 900, y: 1300, height: 200, width: 30 })
      this.randomBrick({ x: 950, y: 1300, height: 200, width: 30 })
      this.randomBrick({ x: 1000, y: 1300, height: 200, width: 30 })
      this.randomBrick({ x: 1050, y: 1300, height: 200, width: 30 })
      this.randomBrick({ x: 1100, y: 1300, height: 200, width: 30 })
      this.randomBrick({ x: 1150, y: 1300, height: 100, width: 30 })
      this.randomBrick({ x: 1200, y: 1300, height: 200, width: 30 })
      this.randomBrick({ x: 1250, y: 1300, height: 200, width: 30 })
      this.randomBrick({ x: 1300, y: 1300, height: 300, width: 30 })
      this.randomBrick({ x: 1350, y: 1300, height: 200, width: 30 })
      this.randomBrick({ x: 1400, y: 1300, height: 200, width: 30 })
      this.randomBrick({ x: 1450, y: 1300, height: 200, width: 30 })
    }
    if (centerBot === true) {
      void new Bot({ x: 100, y: 0, stage: this })
    }

    if (greekBots === true) greekWalls.forEach(wall => wall.spawnBots())
    if (townBots === true) townWalls.forEach(wall => wall.spawnBots())
    if (gridBots === true) gridWaypoints.forEach(waypoint => new Bot({ x: waypoint.x, y: waypoint.y, stage: this }))
    if (countryBots === true) countryWalls.forEach(wall => wall.spawnBots())
    if (waypointBots === true) {
      this.waypoints.forEach(waypoint => {
        void new Bot({ x: waypoint.x, y: waypoint.y, stage: this })
      })
    }
    if (waypointBricks === true) {
      this.waypoints.forEach(waypoint => {
        this.randomBrick({ x: waypoint.x, y: waypoint.y, width: Bot.MAXIMUM_RADIUS * 2, height: Bot.MAXIMUM_RADIUS * 2 })
      })
    }
    if (cornerBots === true) {
      void new Bot({ x: -marginEdge, y: -marginEdge, stage: this })
      void new Bot({ x: marginEdge, y: -marginEdge, stage: this })
      void new Bot({ x: -marginEdge, y: marginEdge, stage: this })
      void new Bot({ x: marginEdge, y: marginEdge, stage: this })
    }
    if (midpointBots === true) {
      void new Bot({ x: 0, y: -marginEdge, stage: this })
      void new Bot({ x: marginEdge, y: 0, stage: this })
      void new Bot({ x: 0, y: marginEdge, stage: this })
      void new Bot({ x: -marginEdge, y: 0, stage: this })
    }
    Matter.Runner.run(this.runner, this.engine)
    const { append } = csvAppend('data.csv')
    Matter.Events.on(this.engine, 'afterUpdate', () => {
      this.stepCount = this.stepCount + 1
      this.raycast.rayCountTotal = this.raycast.rayCountTotal + this.raycast.stepRayCount
      this.totalCollisionCount = this.totalCollisionCount + this.collisionStartCount // + this.activeCollisions
      const bodies = Matter.Composite.allBodies(this.engine.world)
      this.totalBodyCount = this.totalBodyCount + bodies.length
      this.timers.forEach((value, index) => {
        const endTime = value[0]
        const action = value[1]
        if (this.engine.timing.timestamp > endTime) {
          action()
        }
      })
      Array.from(this.timers.entries()).forEach(([key, value]) => {
        const endTime = value[0]
        if (this.engine.timing.timestamp > endTime) {
          this.timers.delete(key)
        }
      })
      const newTime = Date.now()
      const difference = newTime - this.oldTime
      if (DEBUG.STEP_TIME) {
        if (this.initial) {
          console.log('initial difference:', difference)
          this.initial = false
        }

        if (difference >= DEBUG.STEP_TIME_LIMIT) {
          this.warningCount = this.warningCount + 1
          const warningDifference = newTime - this.warningTime
          this.warningDifferenceTotal = this.warningDifferenceTotal + warningDifference
          const average = Math.floor(this.warningDifferenceTotal / this.warningCount)
          this.warnings10.unshift(warningDifference)
          if (this.warnings10.length > 10) {
            this.warnings10.pop()
          }
          const average10 = Math.floor(this.warnings10.reduce((a, b) => a + b, 0) / this.warnings10.length)
          const stepCollisions = this.collisionStartCount + this.activeCollisionCount
          const averageCollisions = Math.floor(this.totalCollisionCount / this.stepCount)
          const averageBodies = Math.floor(this.totalBodyCount / this.stepCount)
          const averageRays = Math.floor(this.raycast.rayCountTotal / this.stepCount)
          console.warn(`Warning ${this.warningCount}: ${difference}ms (∆${warningDifference}, μ${average}, 10μ${average10}) ${this.characters.size} characters
${stepCollisions} collisions (μ${averageCollisions}), ${bodies.length} bodies (μ${averageBodies}), ${this.raycast.stepRayCount} rays (μ${averageRays})`)
          this.warningTime = newTime
        }
        this.oldTime = newTime
      }
      this.runner.enabled = !this.paused
      if (!this.paused) {
        this.lines = []
        this.circles = []
        if (DEBUG.WAYPOINT_CIRCLES) {
          this.waypoints.forEach(waypoint => {
            this.circle({
              color: 'blue',
              radius: 5,
              x: waypoint.x,
              y: waypoint.y
            })
          })
        }
      }
      this.actors.forEach(actor => actor.act())
      const record = {
        warnings: this.warningCount,
        steps: this.stepCount,
        time: newTime,
        difference,
        activeCollisions: this.activeCollisionCount,
        collisionStarts: this.collisionStartCount,
        characters: this.characters.size,
        bodies: bodies.length,
        raycasts: this.raycast.stepRaycasts,
        clears: this.raycast.stepClears
      }
      append(record)
      this.collisionStartCount = 0
      this.activeCollisionCount = 0
      this.raycast.stepRayCount = 0
      this.raycast.stepClears = 0
    })

    Matter.Events.on(this.engine, 'collisionStart', event => {
      event.pairs.forEach(pair => {
        this.collisionStartCount = this.collisionStartCount + 1
        this.collide({ pair })
      })
    })

    Matter.Events.on(this.engine, 'collisionActive', event => {
      event.pairs.forEach(pair => {
        this.activeCollisionCount = this.activeCollisionCount + 1
        const delta = this.engine.timing.lastDelta
        this.collide({ delta, pair })
      })
    })
  }

  circle ({ color = 'black', radius, x, y }: {
    color: string
    radius: number
    x: number
    y: number
  }): void {
    const circle = new Circle({ color, radius, x, y })
    this.circles.push(circle)
  }

  collide ({ delta, pair }: {
    delta?: number
    pair: Matter.IPair
  }): void {
    const actorA = this.actors.get(pair.bodyA.id)
    const actorB = this.actors.get(pair.bodyB.id)
    // @ts-expect-error
    const { normal } = pair.collision
    if (actorA != null && actorB != null) {
      actorA.collide({ actor: actorB, delta, normal })
      actorB.collide({ actor: actorA, delta, normal })
    }
  }

  control ({ controls, id }: {
    controls: Controls
    id: string
  }): void {
    const player = Player.players.get(id)
    if (player == null) {
      throw new Error('Player not found')
    }
    player.controls = controls
    if (player.controls.select) {
      this.paused = false
      this.runner.enabled = !this.paused
    }
  }

  join (id: string): void {
    void new Player({ id, observer: true, x: -100, y: 0, stage: this })
  }

  leave (id: string): void {
    const player = Player.players.get(id)
    if (this.it === player) this.oldest?.makeIt({ predator: this.oldest })
    player?.destroy()
  }

  line ({ color = 'black', end, start }: {
    color: string
    end: Matter.Vector
    start: Matter.Vector
  }): void {
    const line = new Line({ color, end, start })
    this.lines.push(line)
  }

  randomBrick ({ x, y, width, height, minimumWidth = 1, minimumHeight = 1 }: {
    x: number
    y: number
    width: number
    height: number
    minimumWidth?: number
    minimumHeight?: number
  }): Brick {
    const rectangle = getRandomRectangleSize({
      minimumWidth: minimumWidth, maximumWidth: width, minimumHeight: minimumHeight, maximumHeight: height
    })

    return new Brick({
      x, y, width: rectangle.width, height: rectangle.height, stage: this
    })
  }

  timeout (delay: number, action: () => void): void {
    const startTime = this.engine.timing.timestamp
    const endTime = startTime + delay
    this.timers.set(this.timers.size, [endTime, action])
  }

  update (id: string): UpdateMessage {
    const player = Player.players.get(id)
    if (player == null) {
      throw new Error('Player not found')
    }
    if (DEBUG.LOST) {
      this.lostPoints.forEach(point => {
        this.circle({
          color: 'yellow',
          radius: 5,
          x: point.x,
          y: point.y
        })
      })
    }
    const visibleFeatures = player.getVisibleFeatures()
    const shapes = visibleFeatures.map(feature => new Shape(feature.body))
    const message = {
      shapes,
      lines: this.lines,
      circles: this.circles,
      labels: this.labels,
      torsoId: player.feature.body.id
    }
    return message
  }
}
