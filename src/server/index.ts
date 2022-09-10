import express from 'express'
import path from 'path'
import http from 'http'
import https from 'https'
import fs from 'fs'
import socketIo from 'socket.io'
import Matter from 'matter-js'
import Wall from './model/Wall'
import { engine, runner } from './lib/engine'
import { ClientToServerEvents, ServerToClientEvents } from '../shared/socket'
import config from './config.json'
import DebugLine from '../shared/DebugLine'
import Actor from './model/Actor'
import Bot from './model/Bot'
import Character from './model/Character'
import Player from './model/Player'
import Waypoint from './model/Waypoint'
import DebugLabel from '../shared/DebugLabel'
import DebugCircle from '../shared/DebugCircle'
import { VISION_INNER_HEIGHT, VISION_INNER_WIDTH } from '../shared/VISION'
import Puppet from './model/Puppet'
import { EAST_VECTOR, WEST_VECTOR, NORTH_VECTOR, SOUTH_VECTOR } from './lib/directions'
import Brick from './model/Brick'
import { INITIAL, WORLD_MARGIN, WORLD_SIZE } from './lib/world'
import { DEBUG } from './lib/debug'

/* TO DO:
Crates and Puppets Block Navigation Vision
Random starting internal obstacles
Generate AI players
Random boundary size
*/

const app = express()
const staticPath = path.join(__dirname, '..', '..', 'dist')
const staticMiddleware = express.static(staticPath)
app.use(staticMiddleware)

function makeServer (): https.Server | http.Server {
  if (config.secure) {
    const key = fs.readFileSync('./sis-key.pem')
    const cert = fs.readFileSync('./sis-cert.pem')
    const credentials = { key, cert }
    return new https.Server(credentials, app)
  } else {
    return new http.Server(app)
  }
}

const server = makeServer()
const io = new socketIo.Server<ClientToServerEvents, ServerToClientEvents>(server)
const PORT = process.env.PORT ?? 3000
server.listen(PORT, () => {
  console.log(`Listening on :${PORT}`)
  setInterval(tick, 30)
})

async function updateClients (): Promise<void> {
  const sockets = await io.fetchSockets()
  sockets.forEach(socket => {
    const player = Player.players.get(socket.id)

    if (player == null) {
      throw new Error('player = null')
      /*
      const shapes: Shape[] = []
      Feature.features.forEach(feature => shapes.push(new Shape(feature.body)))
      const message = { shapes, debugLines: DebugLine.lines, debugCircles: DebugCircle.circles }
      socket.emit('updateClient', message)
      */
    } else {
      if (DEBUG.LOST) {
        Bot.lostPoints.forEach(point => {
          void new DebugCircle({ x: point.x, y: point.y, radius: 5, color: 'yellow' })
        })
      }

      player.updateClient()
    }
  })
}

function tick (): void {
  void updateClients()
}

io.on('connection', socket => {
  console.log('connection:', socket.id)
  socket.emit('socketId', socket.id)
  const player = new Player({ x: 0, y: -100, socket })

  socket.on('updateServer', message => {
    player.controls = message.controls
    if (player.controls.up) {
      console.log('player.controls.up', player.controls.up)
      Actor.paused = false
      runner.enabled = !Actor.paused
      console.log('Actor.paused', Actor.paused)
    }
  })

  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    const player = Player.players.get(socket.id)
    if (Character.it === player) Bot.oldest?.makeIt()
    player?.destroy()
  })
})

const WALL_SIZE = WORLD_SIZE * 3
const wallProps = [
  { x: 0, y: WORLD_SIZE, width: WALL_SIZE, height: WORLD_SIZE },
  { x: 0, y: -WORLD_SIZE, width: WALL_SIZE, height: WORLD_SIZE },
  { x: WORLD_SIZE, y: 0, width: WORLD_SIZE, height: WALL_SIZE },
  { x: -WORLD_SIZE, y: 0, width: WORLD_SIZE, height: WALL_SIZE }
]
wallProps.forEach(props => new Wall({ ...props, waypoints: false }))

export const PIT = new Wall({ x: 605, y: -955, width: 1700, height: 1000 })
export const BYTE = new Wall({ x: -500, y: -1300, width: 5, height: 5 })
export const PALACE = new Wall({ x: -1000, y: -1150, width: 600, height: 310 })
export const BIT = new Wall({ x: -500, y: -1100, width: 1, height: 1 })
export const FORT = new Wall({ x: -872.5, y: -900, width: 1165, height: 100 })
export const BARRACKS = new Wall({ x: -1244.75, y: -755, width: 420.5, height: 100 })
export const MANSION = new Wall({ x: -520, y: -700, width: 460, height: 210 })
export const KNIFE = new Wall({ x: -1244.75, y: -659, width: 420.5, height: 2 })
export const SCALPEL = new Wall({ x: -1244.75, y: -612.5, width: 420.5, height: 1 })
export const OUTPOST = new Wall({ x: -1244.75, y: -517, width: 420.5, height: 100 })
export const DAGGER = new Wall({ x: -988, y: -500, width: 3, height: 610 })
export const RAPIER = new Wall({ x: -941, y: -400, width: 1, height: 810 })
export const PRECINCT = new Wall({ x: -845, y: -500, width: 100, height: 610 })
export const BUTCHER = new Wall({ x: -700, y: -500, width: 100, height: 100 })
export const BAKER = new Wall({ x: -555, y: -500, width: 100, height: 100 })
export const CANDLESTICK = new Wall({ x: -375, y: -500, width: 170, height: 100 })
export const BAYONET = new Wall({ x: -1244.75, y: -419.5, width: 420.5, height: 5 })
const MAZE_WALLS = [PIT, BYTE, PALACE, BIT, FORT, BARRACKS, MANSION, KNIFE, SCALPEL, OUTPOST, DAGGER, RAPIER, PRECINCT, BUTCHER, BAKER, CANDLESTICK, BAYONET]

void new Wall({ x: -1100, y: 400, width: 200, height: 500 })
void new Wall({ x: 0, y: -200, width: 100, height: 100 })
void new Wall({ x: 1000, y: 200, width: 200, height: 1000 })
void new Wall({ x: -400, y: 600, width: 1000, height: 1000 })
void new Wall({ x: 450, y: 700, width: 100, height: 800 })
void new Wall({ x: -800, y: 1300, width: 400, height: 200 })
void new Wall({ x: 300, y: 1300, width: 800, height: 200 })
void new Wall({ x: -1250, y: 1300, width: 200, height: 50 })

const EDGE_PADDING = Character.MARGIN
const innerSize = WORLD_SIZE - EDGE_PADDING * 2
let xFactor = 2
let xSegment = innerSize / xFactor
while (xSegment > VISION_INNER_WIDTH) {
  xFactor = xFactor + 1
  xSegment = innerSize / xFactor
}
let yFactor = 2
let ySegment = innerSize / yFactor
while (ySegment > VISION_INNER_HEIGHT) {
  yFactor = yFactor + 1
  ySegment = innerSize / yFactor
}
for (let i = 0; i <= xFactor; i++) {
  for (let j = 0; j <= yFactor; j++) {
    const x = -innerSize / 2 + i * xSegment
    const y = -innerSize / 2 + j * ySegment

    void new Waypoint({ x, y })
  }
}

console.log('begin navigation')
Waypoint.waypoints.forEach(waypoint => { waypoint.distances = Waypoint.waypoints.map(() => Infinity) })
console.log('setting neighbors...')
Waypoint.waypoints.forEach(waypoint => waypoint.setNeighbors())
console.log('updating distances...')
Waypoint.waypoints.forEach(() => Waypoint.waypoints.forEach(waypoint => waypoint.updateDistances()))
console.log('setting paths...')
Waypoint.waypoints.forEach(waypoint => waypoint.setPaths())
console.log('debugging waypoints...')
Waypoint.waypoints.forEach(waypoint => {
  if (DEBUG.WAYPOINT_LABELS) {
    const y = DEBUG.WAYPOINT_CIRCLES ? waypoint.y + 50 : waypoint.y
    void new DebugLabel({
      x: waypoint.x, y, text: String(waypoint.id), color: 'white'
    })
  }
})

console.log('navigation complete')

if (INITIAL.BRICKS) {
  void new Brick({ x: -30, y: -30, height: 20, width: 20 })
  void new Brick({ x: 30, y: -30, height: 20, width: 20 })
  void new Brick({ x: 0, y: -30, height: 20, width: 20 })
  void new Brick({ x: 0, y: -30, height: 20, width: 100 })
  void new Brick({ x: 30, y: 0, height: 30, width: 50 })
  void new Brick({ x: -30, y: 0, height: 50, width: 30 })
  void new Brick({ x: -800, y: 0, height: 80, width: 30 })
  void new Brick({ x: -900, y: 0, height: 50, width: 50 })
  void new Brick({ x: -1000, y: 0, height: 50, width: 50 })
  void new Brick({ x: -1100, y: 0, height: 90, width: 80 })
  void new Brick({ x: -1200, y: 0, height: 50, width: 50 })
  void new Brick({ x: -1300, y: 0, height: 50, width: 50 })
  void new Brick({ x: -1400, y: 0, height: 50, width: 50 })
  void new Brick({ x: 0, y: 30, height: 20, width: 20 })
  void new Brick({ x: 30, y: 30, height: 20, width: 20 })
  void new Brick({ x: -30, y: 30, height: 20, width: 20 })
  void new Brick({ x: 800, y: 200, height: 200, width: 100 })
  void new Brick({ x: 500, y: 1400, height: 200, width: 100 })
  void new Brick({ x: -500, y: 1400, height: 100, width: 200 })
  void new Brick({ x: -1300, y: 1300, height: 200, width: 15 })
  void new Brick({ x: 750, y: 1300, height: 200, width: 15 })
  void new Brick({ x: 800, y: 1300, height: 200, width: 15 })
  void new Brick({ x: 850, y: 1300, height: 200, width: 15 })
  void new Brick({ x: 900, y: 1300, height: 200, width: 15 })
  void new Brick({ x: 950, y: 1300, height: 200, width: 15 })
  void new Brick({ x: 1000, y: 1300, height: 200, width: 15 })
  void new Brick({ x: 1050, y: 1300, height: 200, width: 15 })
  void new Brick({ x: 1100, y: 1300, height: 200, width: 15 })
  void new Brick({ x: 1150, y: 1300, height: 100, width: 15 })
  void new Brick({ x: 1200, y: 1300, height: 200, width: 20 })
  void new Brick({ x: 1250, y: 1300, height: 200, width: 15 })
  void new Brick({ x: 1300, y: 1300, height: 300, width: 15 })
  void new Brick({ x: 1350, y: 1300, height: 200, width: 15 })
  void new Brick({ x: 1400, y: 1300, height: 200, width: 15 })
  void new Brick({ x: 1450, y: 1300, height: 200, width: 15 })
}

if (INITIAL.PUPPETS) {
  void new Puppet({
    x: 750,
    y: 750,
    vertices: [
      { x: 0, y: 30 },
      { x: -30, y: -30 },
      { x: 30, y: -30 }
    ],
    direction: WEST_VECTOR
  })
  void new Puppet({
    x: 400,
    y: 200,
    vertices: [
      { x: 0, y: 100 },
      { x: -100, y: -100 },
      { x: 100, y: -100 }
    ],
    direction: NORTH_VECTOR,
    force: 0.01
  })
  void new Puppet({
    x: -1200,
    y: -200,
    vertices: [
      { x: 0, y: 100 },
      { x: -150, y: -50 },
      { x: 100, y: -100 }
    ],
    direction: EAST_VECTOR,
    force: 0.005
  })
  void new Puppet({
    x: -1225,
    y: 900,
    vertices: [
      { x: 0, y: 100 },
      { x: -75, y: -66 },
      { x: 100, y: -144 }
    ],
    direction: SOUTH_VECTOR,
    force: 0.001
  })
}

if (INITIAL.CENTER_BOT) {
  void new Bot({ x: 100, y: -100 })
}

if (INITIAL.MAZE_BOTS) MAZE_WALLS.forEach(wall => wall.initialBots())
if (INITIAL.WAYPOINT_BOTS) {
  Waypoint.waypoints.forEach(waypoint => {
    void new Bot({ x: waypoint.x, y: waypoint.y })
  })
}
if (INITIAL.CORNER_BOTS) {
  void new Bot({ x: -WORLD_MARGIN, y: -WORLD_MARGIN })
  void new Bot({ x: WORLD_MARGIN, y: -WORLD_MARGIN })
  void new Bot({ x: -WORLD_MARGIN, y: WORLD_MARGIN })
  void new Bot({ x: WORLD_MARGIN, y: WORLD_MARGIN })
}
if (INITIAL.MIDPOINT_BOTS) {
  void new Bot({ x: 0, y: -WORLD_MARGIN })
  void new Bot({ x: WORLD_MARGIN, y: 0 })
  void new Bot({ x: 0, y: WORLD_MARGIN })
  void new Bot({ x: -WORLD_MARGIN, y: 0 })
}
// PIT.initialBots()
// MANSION.initialBots()
// FORT.initialBots()
// PRECINCT.initialBots()
// CANDLESTICK.initialBots()

Matter.Runner.run(runner, engine)

let oldTime = Date.now()
let warningTime = Date.now()
let warningCount = 0
let warningDifferenceTotal = 0
let initial = true
Matter.Events.on(engine, 'afterUpdate', () => {
  if (DEBUG.STEP_TIME) {
    const newTime = Date.now()
    const difference = newTime - oldTime
    if (initial) {
      console.log('initial difference:', difference)
      initial = false
    }

    if (difference >= DEBUG.STEP_TIME_LIMIT) {
      warningCount = warningCount + 1
      const warningDifference = newTime - warningTime
      warningDifferenceTotal = warningDifferenceTotal + warningDifference
      const average = Math.floor(warningDifferenceTotal / warningCount)
      console.warn(`Warning ${warningCount}: ${difference}ms (∆${warningDifference}) [μ${average}] <${Bot.botCount} bots>`)
      warningTime = newTime
    }
    oldTime = newTime
  }
  runner.enabled = !Actor.paused
  if (!Actor.paused) {
    DebugLine.lines = []
    DebugCircle.circles = []
    if (DEBUG.WAYPOINT_CIRCLES) {
      Waypoint.waypoints.forEach(waypoint => {
        void new DebugCircle({ x: waypoint.x, y: waypoint.y, radius: 5, color: 'blue' })
      })
    }
  }
  Actor.actors.forEach(actor => actor.act())
})

Matter.Events.on(engine, 'collisionStart', event => {
  event.pairs.forEach(pair => {
    const actorA = Actor.actors.get(pair.bodyA.id)
    const actorB = Actor.actors.get(pair.bodyB.id)
    if (actorA != null) {
      actorA.collide({ actor: actorB })
    }
    if (actorB != null) {
      actorB.collide({ actor: actorA })
    }
  })
})
