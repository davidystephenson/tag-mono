import csvAppend from 'csv-append'
import Matter from 'matter-js'
import Raycast from './Raycast'
import Actor from './Actor'
import Bot from './Bot'
import Brick from './Brick'
import Character from './Character'
import Feature from './Feature'
import Player from './Player'
import Wall from './Wall'
import Waypoint from './Waypoint'
import Line from '../shared/Line'
import Circle from '../shared/Circle'
import Controls from '../shared/controls'
import Label from '../shared/Label'
import Shape from '../shared/Shape'
import { UpdateMessage } from '../shared/socket'
import { VISION_INNER } from '../shared/VISION'
import { getRandomRectangleSize } from './math'
import Puppet from './Puppet'
import { EAST_VECTOR, NORTH_VECTOR, SOUTH_VECTOR, WEST_VECTOR } from '../shared/math'

export default class Stage {
  stepActiveCollisionCount = 0
  actors = new Map<number, Actor>()
  bodies: Matter.Body[] = []
  bots: Bot[] = []
  characters = new Map<number, Character>()
  characterBodies: Matter.Body[] = []
  circles: Circle[] = []
  stepCollisionStartCount = 0
  debugBored: boolean
  debugCharacters: boolean
  debugChase: boolean
  debugOpenWaypoints: boolean
  debugCollision: boolean
  debugFeatures: boolean
  debugIsClear: boolean
  debugItChoice: boolean
  debugLost: boolean
  debugMakeIt: boolean
  debugNotItChoice: boolean
  debugPathing: boolean
  debugPlayerVision: boolean
  debugPosition: boolean
  debugSpeed: boolean
  debugStepTime: boolean
  debugExplore: boolean
  debugWaypointCircles: boolean
  debugWaypointLabels: boolean
  engine = Matter.Engine.create()
  features = new Map<number, Feature>()
  initial = true
  labels: Label[] = []
  lines: Line[] = []
  lostPoints: Matter.Vector[] = []
  observer: boolean
  oldest?: Bot
  oldTime = Date.now()
  paused = false
  radii = [10, 11, 12, 13, 14, 15]
  raycast: Raycast
  runner = Matter.Runner.create()
  sceneryFeatures: Feature[] = []
  sceneryBodies: Matter.Body[] = []
  spawnOnDestroy: boolean
  spawnOnScore: boolean
  spawnOnTag: boolean
  spawnOnTimer: boolean
  stepCount = 0
  stepPursues = 0
  stepUnblocks = 0
  stepExplores = 0
  stepFlees = 0
  stepTimeLimit: number
  spawnTime: number
  timers = new Map<number, [number, () => void]>()
  totalBodyCount = 0
  totalCollisionCount = 0
  wallBodies: Matter.Body[] = []
  walls: Wall[] = []
  warningCount = 0
  warningDifferenceTotal = 0
  warningTime = Date.now()
  readonly warnings10: number[] = []
  waypointGroups: Record<number, Waypoint[]> = { }
  xFactor = 2
  xSegment: number
  yFactor = 2
  ySegment: number
  constructor ({
    centerBot = true,
    cornerBots = false,
    country = true,
    countryBots = false,
    debugBored = false,
    debugCharacters = false,
    debugChase = false,
    debugOpenWaypoints = false,
    debugCollision = false,
    debugExplore = false,
    debugFeatures = false,
    debugIsClear = false,
    debugItChoice = false,
    debugLost = false,
    debugMakeIt = false,
    debugNotItChoice = false,
    debugPathing = false,
    debugPlayerVision = false,
    debugPosition = false,
    debugSpeed = false,
    debugStepTime = true,
    debugWaypointCircles = false,
    debugWaypointLabels = false,
    greek = true,
    greekBots = false,
    gridBots = false,
    midpointBots = false,
    observer = false,
    spawnOnDestroy = true,
    spawnOnScore = true,
    spawnOnTag = true,
    spawnOnTimer = true,
    size = 3000,
    stepTimeLimit = 35,
    town = true,
    townBots = false,
    wallBots = false,
    waypointBots = false,
    waypointBricks = false,
    wildBricks = true,
    wildPuppets = true
  }: {
    centerBot?: boolean
    cornerBots?: boolean
    country?: boolean
    countryBots?: boolean
    debugBored?: boolean
    debugCharacters?: boolean
    debugChase?: boolean
    debugOpenWaypoints?: boolean
    debugCollision?: boolean
    debugExplore?: boolean
    debugFeatures?: boolean
    debugIsClear?: boolean
    debugItChoice?: boolean
    debugLost?: boolean
    debugMakeIt?: boolean
    debugNotItChoice?: boolean
    debugPathing?: boolean
    debugPosition?: boolean
    debugPlayerVision?: boolean
    debugSpeed?: boolean
    debugStepTime?: boolean
    debugWaypointCircles?: boolean
    debugWaypointLabels?: boolean
    greek?: boolean
    greekBots?: boolean
    gridBots?: boolean
    midpointBots?: boolean
    observer?: boolean
    spawnOnDestroy?: boolean
    spawnOnScore?: boolean
    spawnOnTag?: boolean
    spawnOnTimer?: boolean
    size?: number
    stepTimeLimit?: number
    town?: boolean
    townBots?: boolean
    wallBots?: boolean
    waypointBots?: boolean
    waypointBricks?: boolean
    wildBricks?: boolean
    wildPuppets?: boolean
  }) {
    this.spawnTime = Date.now()
    this.debugBored = debugBored
    this.debugCharacters = debugCharacters
    this.debugChase = debugChase
    this.debugOpenWaypoints = debugOpenWaypoints
    this.debugCollision = debugCollision
    this.debugFeatures = debugFeatures
    this.debugIsClear = debugIsClear
    this.debugItChoice = debugItChoice
    this.debugLost = debugLost
    this.debugMakeIt = debugMakeIt
    this.debugNotItChoice = debugNotItChoice
    this.debugPathing = debugPathing
    this.debugPlayerVision = debugPlayerVision
    this.debugPosition = debugPosition
    this.debugSpeed = debugSpeed
    this.debugStepTime = debugStepTime
    this.debugExplore = debugExplore
    this.debugWaypointCircles = debugWaypointCircles
    this.debugWaypointLabels = debugWaypointLabels
    this.observer = observer
    this.spawnOnDestroy = spawnOnDestroy
    this.spawnOnScore = spawnOnScore
    this.spawnOnTag = spawnOnTag
    this.spawnOnTimer = spawnOnTimer
    this.stepTimeLimit = stepTimeLimit
    this.engine.gravity = { x: 0, y: 0, scale: 1 }
    this.raycast = new Raycast({ stage: this })
    this.radii.forEach(radius => { this.waypointGroups[radius] = [] })
    const wallSize = size * 3
    const wallProps = [
      { x: 0, y: size, width: wallSize, height: size },
      { x: 0, y: -size, width: wallSize, height: size },
      { x: size, y: 0, width: size, height: wallSize },
      { x: -size, y: 0, width: size, height: wallSize }
    ]
    wallProps.forEach((props) => {
      void new Wall({ ...props, waypoints: false, stage: this })
    })
    const halfSize = size / 2
    const marginEdge = halfSize - Character.MARGIN
    const townWalls: Wall[] = []
    if (town) {
      const PIT = new Wall({ x: 605, y: -955, width: 1700, height: 1000, stage: this })
      const BYTE = new Wall({ x: -500, y: -1300, width: 5, height: 5, stage: this })
      const PALACE = new Wall({ x: -1000, y: -1150, width: 600, height: 310, stage: this })
      const BIT = new Wall({ x: -500, y: -1100, width: 1, height: 1, stage: this })
      const FORT = new Wall({ x: -872.5, y: -900, width: 1165, height: 100, stage: this })
      const MANSION = new Wall({ x: -520, y: -700, width: 460, height: 210, stage: this })
      const KNIFE = new Wall({ x: -1244.75, y: -659, width: 420.5, height: 2, stage: this })
      const SCALPEL = new Wall({ x: -1244.75, y: -612.5, width: 420.5, height: 1, stage: this })
      const OUTPOST = new Wall({ x: -1350, y: -517, width: 175, height: 100, stage: this })
      const ARMORY = new Wall({ x: -1125, y: -517, width: 175, height: 100, stage: this })
      const DAGGER = new Wall({ x: -988, y: -500, width: 3, height: 610, stage: this })
      const RAPIER = new Wall({ x: -941, y: -400, width: 1, height: 810, stage: this })
      const PRECINCT = new Wall({ x: -845, y: -500, width: 100, height: 610, stage: this })
      const BUTCHER = new Wall({ x: -700, y: -500, width: 100, height: 100, stage: this })
      const BAKER = new Wall({ x: -555, y: -500, width: 100, height: 100, stage: this })
      const CANDLESTICK = new Wall({ x: -375, y: -500, width: 170, height: 100, stage: this })
      const BAYONET = new Wall({ x: -1244.75, y: -419.5, width: 420.5, height: 5, stage: this })
      townWalls.push(PIT, BYTE, PALACE, BIT, FORT, MANSION, KNIFE, SCALPEL, OUTPOST, ARMORY, DAGGER, RAPIER, PRECINCT, BUTCHER, BAKER, CANDLESTICK, BAYONET)
    }

    const greekWalls: Wall[] = []
    if (greek) {
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
    if (country) {
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
    if (wallBots) {
      this.walls.forEach(wall => wall.spawnBots())
    }
    const innerSize = size - Character.MARGIN * 2
    this.xFactor = 2
    this.xSegment = innerSize / this.xFactor
    while (this.xSegment > VISION_INNER.width) {
      this.xFactor = this.xFactor + 1
      this.xSegment = innerSize / this.xFactor
    }
    this.yFactor = 2
    this.ySegment = innerSize / this.yFactor
    while (this.ySegment > VISION_INNER.height) {
      this.yFactor = this.yFactor + 1
      this.ySegment = innerSize / this.yFactor
    }
    const gridPoints: Matter.Vector[] = []
    for (let i = 0; i <= this.xFactor; i++) {
      for (let j = 0; j <= this.yFactor; j++) {
        const x = -innerSize / 2 + i * this.xSegment
        const y = -innerSize / 2 + j * this.ySegment
        gridPoints.push({ x, y })
        this.radii.forEach(radius => {
          void new Waypoint({ stage: this, x, y, radius })
        })
      }
    }
    this.radii.forEach(radius => {
      console.info('Pathfinding for radius:', radius)
      const group = this.waypointGroups[radius]
      if (group.length === 0) {
        throw new Error(`No waypoints for radius ${radius}`)
      }
      group.forEach(waypoint => {
        waypoint.distances = group.map(() => Infinity)
      })
      console.info('Setting neighbors...')
      group.forEach(waypoint => {
        waypoint.setNeighbors()
        if (waypoint.neighbors.length === 0) {
          console.info('neighbors', waypoint.id, waypoint.neighbors.length)
          this.circle({ radius: 10, x: waypoint.x, y: waypoint.y, color: 'orange' })
        }
      })
      console.info('Updating distances...')
      group.forEach(() => group.forEach(waypoint => waypoint.updateDistances()))
      console.info('Setting paths...')
      group.forEach(waypoint => {
        waypoint.setPaths()
      })
    })
    console.info('Pathfinding complete!')
    if (wildBricks) {
      void new Brick({ stage: this, x: -500, y: 0, width: 200, height: 500 })
      this.randomBrick({ x: -30, y: -30, height: 30, width: 30 })
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
    if (wildPuppets) {
      const vertices = [
        { x: 100.75, y: 253.97279832749837 },
        { x: 100.75, y: -153.97279832749837 },
        { x: -100.75, y: 0 }
      ]
      void new Puppet({
        x: -1200,
        y: -1200,
        direction: SOUTH_VECTOR,
        stage: this,
        vertices
      })
      void new Puppet({
        x: 1350,
        y: -200,
        direction: NORTH_VECTOR,
        force: 0.0001,
        stage: this
      })
      void new Puppet({
        x: 1000,
        y: 0,
        force: 0.008,
        direction: WEST_VECTOR,
        stage: this
      })
      void new Puppet({
        x: -1700,
        y: 1700,
        direction: EAST_VECTOR,
        stage: this,
        vertices
      })
    }
    if (centerBot) void new Bot({ x: 100, y: 0, stage: this })
    if (greekBots) greekWalls.forEach(wall => wall.spawnBots())
    if (townBots) townWalls.forEach(wall => wall.spawnBots())
    if (gridBots) gridPoints.forEach(point => new Bot({ x: point.x, y: point.y, stage: this }))
    if (countryBots) countryWalls.forEach(wall => wall.spawnBots())
    if (waypointBots || waypointBricks) {
      const waypointArrays = Object.values(this.waypointGroups)
      const waypoints = waypointArrays.reduce((waypoints, waypointArray) => [...waypoints, ...waypointArray], [])
      if (waypointBots) {
        waypoints.forEach(waypoint => {
          void new Bot({ x: waypoint.x, y: waypoint.y, stage: this })
        })
      }
      if (waypointBricks) {
        waypoints.forEach(waypoint => {
          this.randomBrick({ x: waypoint.x, y: waypoint.y, width: Bot.MAXIMUM_RADIUS * 2, height: Bot.MAXIMUM_RADIUS * 2 })
        })
      }
    }
    if (cornerBots) {
      void new Bot({ x: -marginEdge, y: -marginEdge, stage: this })
      void new Bot({ x: marginEdge, y: -marginEdge, stage: this })
      void new Bot({ x: -marginEdge, y: marginEdge, stage: this })
      void new Bot({ x: marginEdge, y: marginEdge, stage: this })
    }
    if (midpointBots) {
      void new Bot({ x: 0, y: -marginEdge, stage: this })
      void new Bot({ x: marginEdge, y: 0, stage: this })
      void new Bot({ x: 0, y: marginEdge, stage: this })
      void new Bot({ x: -marginEdge, y: 0, stage: this })
    }
    Matter.Runner.run(this.runner, this.engine)
    const { append } = csvAppend('steps.csv')
    Matter.Events.on(this.engine, 'afterUpdate', () => {
      this.stepCount = this.stepCount + 1
      this.raycast.rayCountTotal = this.raycast.rayCountTotal + this.raycast.stepRayCount
      this.totalCollisionCount = this.totalCollisionCount + this.stepCollisionStartCount // + this.activeCollisions
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
      if (this.debugStepTime) {
        if (this.initial) {
          console.debug('initial difference:', difference)
          this.initial = false
        }

        if (difference >= this.stepTimeLimit) {
          this.warningCount = this.warningCount + 1
          const warningDifference = newTime - this.warningTime
          this.warningDifferenceTotal = this.warningDifferenceTotal + warningDifference
          const average = Math.floor(this.warningDifferenceTotal / this.warningCount)
          this.warnings10.unshift(warningDifference)
          if (this.warnings10.length > 10) {
            this.warnings10.pop()
          }
          const average10 = Math.floor(this.warnings10.reduce((a, b) => a + b, 0) / this.warnings10.length)
          const stepCollisions = this.stepCollisionStartCount + this.stepActiveCollisionCount
          const averageCollisions = Math.floor(this.totalCollisionCount / this.stepCount)
          const averageBodies = Math.floor(this.totalBodyCount / this.stepCount)
          const averageRays = Math.floor(this.raycast.rayCountTotal / this.stepCount)
          console.warn(`Warning! ${this.warningCount}: ${difference}ms (∆${warningDifference}, μ${average}, 10μ${average10}) ${this.characters.size} characters
${stepCollisions} collisions (μ${averageCollisions}), ${bodies.length} bodies (μ${averageBodies}), ${this.raycast.stepRayCount} rays (μ${averageRays})`)
          this.warningTime = newTime
        }
        this.oldTime = newTime
      }
      this.runner.enabled = !this.paused
      if (!this.paused) {
        this.lines = []
        this.circles = []
        if (this.debugWaypointCircles) {
          this.waypointGroups[15].forEach(waypoint => {
            this.circle({
              color: 'darkblue',
              radius: 5,
              x: waypoint.x,
              y: waypoint.y
            })
          })
        }
      }
      this.actors.forEach(actor => actor.act())
      if (this.spawnOnTimer) {
        const now = Date.now()
        const spawnDifference = now - this.spawnTime
        const spawnLimit = this.getSpawnLimit()
        if (spawnDifference > spawnLimit) {
          const waypoint = this.getSafestWaypoint()
          void new Bot({ x: waypoint.position.x, y: waypoint.position.y, stage: this })
          this.spawnTime = now
        }
      }
      const record = {
        warnings: this.warningCount,
        steps: this.stepCount,
        time: newTime,
        difference,
        activeCollisions: this.stepActiveCollisionCount,
        collisionStarts: this.stepCollisionStartCount,
        characters: this.characters.size,
        bodies: bodies.length,
        raycasts: this.raycast.stepRaycasts,
        clears: this.raycast.stepClears,
        unblocks: this.stepUnblocks,
        explores: this.stepExplores,
        flees: this.stepFlees,
        pursues: this.stepPursues
      }
      append(record)
      this.stepCollisionStartCount = 0
      this.stepActiveCollisionCount = 0
      this.stepPursues = 0
      this.stepExplores = 0
      this.stepFlees = 0
      this.stepUnblocks = 0
      this.raycast.stepRayCount = 0
      this.raycast.stepClears = 0
    })

    Matter.Events.on(this.engine, 'collisionStart', event => {
      event.pairs.forEach(pair => {
        this.stepCollisionStartCount = this.stepCollisionStartCount + 1
        this.collide({ pair })
      })
    })

    Matter.Events.on(this.engine, 'collisionActive', event => {
      event.pairs.forEach(pair => {
        this.stepActiveCollisionCount = this.stepActiveCollisionCount + 1
        const delta = this.engine.timing.lastDelta
        this.collide({ delta, pair })
      })
    })
  }

  circle ({ color = 'white', radius, x, y }: {
    color?: string
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
    actorA?.collide({ actor: actorB, body: pair.bodyB, delta, normal })
    actorB?.collide({ actor: actorA, body: pair.bodyA, delta, normal })
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

  debug ({ label }: { label?: string | number }): void {
    console.debug('CLIENT DEBUG:', label)
    console.debug(label, 'bots length:', this.bots.length)
  }

  getAllIts (): Character[] {
    const its: Character[] = []
    const characters = this.characters.values()
    for (const character of characters) {
      const it = character.isIt()
      if (it) its.push(character)
    }
    return its
  }

  getFirstIt (): Character | undefined {
    const characters = this.characters.values()
    for (const character of characters) {
      if (character.isIt()) return character
    }
  }

  getSafestWaypoint (): Waypoint {
    const allIts = this.getAllIts()
    const waypoints = this.waypointGroups[15]
    const farthest = waypoints.reduce<{ waypoint?: Waypoint, distance: number }>((farthest, waypoint) => {
      const distance = allIts.reduce((distance, it) => {
        const d = Matter.Vector.magnitude(Matter.Vector.sub(it.feature.body.position, waypoint.position))
        return d < distance ? d : distance
      }, Infinity)
      return distance > farthest.distance ? { waypoint, distance } : farthest
    }, { distance: 0 })
    if (farthest.waypoint == null) {
      throw new Error('No farthest waypoint')
    }
    return farthest.waypoint
  }

  getSpawnLimit (): number {
    return this.characters.size * 500
  }

  join (id: string): Player {
    const firstIt = this.getFirstIt()
    console.log('firstIt', firstIt)
    if (firstIt == null) {
      return new Player({
        id,
        observer: this.observer,
        x: 0,
        y: 0,
        stage: this,
        blue: Character.IT_COLOR.blue,
        green: Character.IT_COLOR.green,
        red: Character.IT_COLOR.red
      })
    }
    const position = firstIt?.getExploreHeading({})?.waypoint.position ?? { x: 0, y: 0 }
    return new Player({
      id,
      observer: this.observer,
      x: position.x,
      y: position.y,
      stage: this
    })
  }

  leave (id: string): void {
    const player = Player.players.get(id)
    if (player == null) return
    if (player?.isIt()) {
      const its = this.getAllIts()
      if (its.length === 1) {
        const notItBots = this.bots.filter(bot => !bot.isIt())
        notItBots[0]?.makeIt({ oldIt: player })
      }
    }
    player?.destroy()
  }

  label ({ color = 'white', text, x, y }: {
    color?: string
    text: string
    x: number
    y: number
  }): void {
    const label = new Label({ color, text, x, y })
    this.labels.push(label)
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

  spawnSafestBrick (): void {
    const waypoint = this.getSafestWaypoint()
    this.randomBrick({
      x: waypoint.position.x,
      y: waypoint.position.y,
      width: 30,
      height: 30
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
    if (this.lostPoints.length > 100) {
      this.lostPoints = this.lostPoints.slice(-100)
    }
    if (this.debugLost) {
      this.lostPoints.forEach(point => {
        this.circle({
          color: 'yellow',
          radius: 5,
          x: point.x,
          y: point.y
        })
      })
    }
    const visibleFeatures = this.debugFeatures ? [...this.features.values()] : player.getVisibleFeatures()
    const shapes = visibleFeatures.map(feature => {
      const shape = new Shape({
        alpha: feature.alpha,
        blue: feature.blue,
        body: feature.body,
        green: feature.green,
        red: feature.red
      })
      if (shape.id === player.feature.body.id) {
        const color = player.isIt()
          ? 'hotpink'
          : 'limegreen'
        const newRender = { ...shape.render, strokeStyle: color }
        const newShape = { ...shape, render: newRender }
        return newShape
      }
      return shape
    })
    const message = {
      shapes,
      lines: this.lines,
      circles: this.circles,
      labels: this.labels,
      torsoId: player.feature.body.id
    }
    player.goals.forEach((goal) => {
      const circleColor = goal.scored ? 'rgba(255, 255, 255, 0.25)' : goal.heading.tight ? 'rgba(0, 128, 0, 0.25)' : 'rgba(0, 255, 0, 0.25)'
      const radius = goal.heading.tight ? 15 : 7.5
      const circle = new Circle({
        color: circleColor,
        radius,
        x: goal.heading.waypoint.position.x,
        y: goal.heading.waypoint.position.y
      })
      message.circles = [...message.circles, circle]
      const labelColor = 'white'
      const text = goal.scored
        ? goal.number
        : goal.heading.tight
          ? player.score + 5
          : player.score + 1
      const label = new Label({
        color: labelColor,
        text: String(text),
        x: goal.heading.waypoint.position.x,
        y: goal.heading.waypoint.position.y
      })
      message.labels = [...message.labels, label]
    })
    const passes = player.goals.filter(goal => goal.passed)
    if (passes.length > 1) {
      throw new Error('More than one pass')
    }
    passes.forEach(pass => {
      const color = pass.scored ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 255, 0, 0.15)'
      const circle = new Circle({
        color,
        radius: 10,
        x: pass.heading.waypoint.position.x,
        y: pass.heading.waypoint.position.y
      })
      message.circles = [...message.circles, circle]
    })

    return message
  }
}
