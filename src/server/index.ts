import express from 'express'
import path from 'path'
import http from 'http'
import https from 'https'
import fs from 'fs'
import socketIo from 'socket.io'
import Matter from 'matter-js'
import Wall from './model/Wall'
import { DEBUG_STEP_TIME, DEBUG_STEP_TIME_LIMIT, engine, runner } from './lib/engine'
import { ClientToServerEvents, ServerToClientEvents } from '../shared/socket'
import config from './config.json'
import DebugLine from '../shared/DebugLine'
import Actor from './model/Actor'
import Crate from './model/Crate'
import Bot from './model/Bot'
import Character from './model/Character'
import Player from './model/Player'
import Waypoint from './model/Waypoint'
import DebugLabel from '../shared/DebugLabel'
import DebugCircle from '../shared/DebugCircle'
import { VISION_INNER_HEIGHT, VISION_INNER_WIDTH } from '../shared/VISION'
import Feature from './model/Feature'

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
      if (Bot.DEBUG_LOST) {
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
  })

  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    const player = Player.players.get(socket.id)
    if (Character.it === player) Bot.oldest?.makeIt()
    player?.destroy()
  })
})

const MAP_SIZE = 3000
const WALL_SIZE = MAP_SIZE * 3
const wallProps = [
  { x: 0, y: MAP_SIZE, width: WALL_SIZE, height: MAP_SIZE },
  { x: 0, y: -MAP_SIZE, width: WALL_SIZE, height: MAP_SIZE },
  { x: MAP_SIZE, y: 0, width: MAP_SIZE, height: WALL_SIZE },
  { x: -MAP_SIZE, y: 0, width: MAP_SIZE, height: WALL_SIZE }
]
wallProps.forEach(props => new Wall({ ...props, waypoints: false }))

void new Wall({ x: 1000, y: -1100, width: 820, height: 500 })
void new Wall({ x: -1000, y: -1100, width: 400, height: 200 })
void new Wall({ x: 0, y: -900, width: 50, height: 800 })
void new Wall({ x: -500, y: -1300, width: 100, height: 100 })
void new Wall({ x: -500, y: -1100, width: 100, height: 100 })
void new Wall({ x: -500, y: -900, width: 100, height: 100 })
void new Wall({ x: -500, y: -700, width: 100, height: 100 })
void new Wall({ x: -1300, y: -500, width: 100, height: 100 })
void new Wall({ x: -1100, y: -500, width: 100, height: 100 })
void new Wall({ x: -900, y: -500, width: 100, height: 100 })
void new Wall({ x: -700, y: -500, width: 100, height: 100 })
void new Wall({ x: -500, y: -500, width: 100, height: 100 })
void new Wall({ x: -240, y: -500, width: 220, height: 100 })
void new Wall({ x: 400, y: -500, width: 200, height: 500 })
void new Wall({ x: -1100, y: 400, width: 200, height: 500 })
void new Wall({ x: 0, y: -200, width: 100, height: 100 })
void new Wall({ x: 1000, y: 200, width: 200, height: 1500 })
void new Wall({ x: -400, y: 600, width: 1000, height: 1000 })
void new Wall({ x: 450, y: 700, width: 200, height: 800 })
void new Wall({ x: -800, y: 1300, width: 400, height: 200 })
void new Wall({ x: 300, y: 1300, width: 800, height: 200 })
void new Wall({ x: -1250, y: 1300, width: 200, height: 50 })

const EDGE_PADDING = 45
const innerSize = MAP_SIZE - EDGE_PADDING * 2
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
// const GRID_RATIO = 8
// const stepSize = innerSize / GRID_RATIO
// for (let i = 0; i < GRID_RATIO + 1; i++) {
// for (let j = 0; j < GRID_RATIO + 1; j++) {
// const x = -innerSize / 2 + i * stepSize
// const y = -innerSize / 2 + j * stepSize
// void new Waypoint({ x, y })
// }
// }

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
  if (DebugLabel.WAYPOINTS) {
    const y = DebugCircle.WAYPOINTS ? waypoint.y + 50 : waypoint.y
    void new DebugLabel({
      x: waypoint.x, y, text: waypoint.label.toString(), color: 'white'
    })
  }
})

console.log('navigation complete')

// void new Crate({ x: 200, y: -1200, height: 500, width: 10 })
// void new Crate({ x: -0, y: -900, height: 300, width: 100 })
// void new Crate({ x: -800, y: -800, height: 10, width: 200 })
// void new Crate({ x: -800, y: -200, height: 300, width: 10 })
// void new Crate({ x: -500, y: -200, height: 300, width: 100 })
// void new Crate({ x: -30, y: -30, height: 20, width: 20 })
// void new Crate({ x: 30, y: -30, height: 20, width: 20 })
// void new Crate({ x: 0, y: -30, height: 20, width: 20 })
// void new Crate({ x: 0, y: -30, height: 20, width: 100 })
// void new Crate({ x: 30, y: 0, height: 30, width: 50 })
// void new Crate({ x: -30, y: 0, height: 50, width: 30 })
// void new Crate({ x: -800, y: 0, height: 80, width: 30 })
// void new Crate({ x: -900, y: 0, height: 50, width: 50 })
// void new Crate({ x: -1000, y: 0, height: 50, width: 50 })
// void new Crate({ x: -1100, y: 0, height: 90, width: 80 })
// void new Crate({ x: -1200, y: 0, height: 50, width: 50 })
// void new Crate({ x: -1300, y: 0, height: 50, width: 50 })
// void new Crate({ x: -1400, y: 0, height: 50, width: 50 })
// void new Crate({ x: 0, y: 30, height: 20, width: 20 })
// void new Crate({ x: 30, y: 30, height: 20, width: 20 })
// void new Crate({ x: -30, y: 30, height: 20, width: 20 })
// void new Crate({ x: 800, y: 200, height: 200, width: 100 })
// void new Crate({ x: 500, y: 1400, height: 200, width: 100 })
// void new Crate({ x: -500, y: 1400, height: 100, width: 200 })
// void new Crate({ x: -1300, y: 1300, height: 200, width: 10 })
// void new Crate({ x: 750, y: 1300, height: 200, width: 10 })
// void new Crate({ x: 800, y: 1300, height: 200, width: 10 })
// void new Crate({ x: 850, y: 1300, height: 200, width: 10 })
// void new Crate({ x: 900, y: 1300, height: 200, width: 10 })
// void new Crate({ x: 950, y: 1300, height: 200, width: 10 })
// void new Crate({ x: 1000, y: 1300, height: 200, width: 10 })
// void new Crate({ x: 1050, y: 1300, height: 200, width: 10 })
// void new Crate({ x: 1100, y: 1300, height: 200, width: 10 })
// void new Crate({ x: 1150, y: 1300, height: 100, width: 10 })
// void new Crate({ x: 1200, y: 1300, height: 200, width: 20 })
// void new Crate({ x: 1250, y: 1300, height: 200, width: 10 })
// void new Crate({ x: 1300, y: 1300, height: 300, width: 10 })
// void new Crate({ x: 1350, y: 1300, height: 200, width: 10 })
// void new Crate({ x: 1400, y: 1300, height: 200, width: 10 })
// void new Crate({ x: 1450, y: 1300, height: 200, width: 10 })
// void new Puppet({
//   x: -685,
//   y: -1110,
//   vertices: [
//     { x: 0, y: 50 },
//     { x: -50, y: -50 },
//     { x: 50, y: -50 }
//   ]
// })
// void new Puppet({
//   x: 1400,
//   y: -1425,
//   vertices: [
//     { x: 0, y: 20 },
//     { x: -20, y: -20 },
//     { x: 20, y: -20 }
//   ],
//   direction: EAST_VECTOR,
//   force: 0.0
// })
// void new Puppet({
//   x: 750,
//   y: 750,
//   vertices: [
//     { x: 0, y: 30 },
//     { x: -30, y: -30 },
//     { x: 30, y: -30 }
//   ],
//   direction: WEST_VECTOR
// })
// void new Puppet({
//   x: 400,
//   y: 200,
//   vertices: [
//     { x: 0, y: 100 },
//     { x: -100, y: -100 },
//     { x: 100, y: -100 }
//   ],
//   direction: NORTH_VECTOR,
//   force: 0.1
// })
// void new Puppet({
//   x: -1200,
//   y: -200,
//   vertices: [
//     { x: 0, y: 100 },
//     { x: -150, y: -50 },
//     { x: 100, y: -100 }
//   ],
//   direction: EAST_VECTOR,
//   force: 0.05
// })
// void new Puppet({
//   x: -1225,
//   y: 900,
//   vertices: [
//     { x: 0, y: 100 },
//     { x: -75, y: -66 },
//     { x: 100, y: -144 }
//   ],
//   direction: SOUTH_VECTOR,
//   force: 0.1
// })

Waypoint.waypoints.forEach(waypoint => {
  void new Bot({ x: waypoint.x, y: waypoint.y })
})
void new Bot({ x: 100, y: -100 })
// void new Bot({ x: 499, y: 500 })
// void new Bot({ x: -500, y: -500 })
// void new Bot({ x: 500, y: -500 })
// void new Bot({ x: -500, y: 500 })
// void new Bot({ x: 800, y: 800 })
// void new Bot({ x: -800, y: -800 })

Matter.Runner.run(runner, engine)

let oldTime = Date.now()
let warningTime = Date.now()
let warningCount = 0
let warningDifferenceTotal = 0
let initial = true
Matter.Events.on(engine, 'afterUpdate', () => {
  if (DEBUG_STEP_TIME) {
    const newTime = Date.now()
    const difference = newTime - oldTime
    if (initial) {
      console.log('initial difference:', difference)
      initial = false
    }

    if (difference > DEBUG_STEP_TIME_LIMIT) {
      warningCount = warningCount + 1
      const warningDifference = newTime - warningTime
      warningDifferenceTotal = warningDifferenceTotal + warningDifference
      const average = Math.floor(warningDifferenceTotal / warningCount)
      console.log(`Warning ${warningCount}: ${difference} (${warningDifference}) [${average}]`)
      warningTime = newTime
    }
    oldTime = newTime
  }
  runner.enabled = !Actor.paused
  DebugLine.lines = []
  DebugCircle.circles = []
  if (DebugCircle.WAYPOINTS) {
    Waypoint.waypoints.forEach(waypoint => {
      void new DebugCircle({ x: waypoint.x, y: waypoint.y, radius: 5, color: 'white' })
    })
  }
  Actor.actors.forEach(actor => actor.act())
})

Matter.Events.on(engine, 'collisionStart', event => {
  event.pairs.forEach(pair => {
    // console.log('collide', pair.bodyA.label, pair.bodyB.label)
    if (pair.bodyA.label === 'character') {
      if (pair.bodyB.label === 'character') {
        // pair.isActive = false
        // state.paused = true
        const actorA = Actor.actors.get(pair.bodyA.id) as Character
        const actorB = Actor.actors.get(pair.bodyB.id) as Character
        // const bodyA = actorA.feature.body
        // const bodyB = actorB.feature.body
        // console.log('collide actors', bodyA.id, bodyA.label, bodyB.id, bodyB.label)
        if (Character.it === actorA && actorA.controllable) {
          actorB.makeIt()
        } else if (Character.it === actorB && actorB.controllable) {
          actorA.makeIt()
        }
      }

      if (pair.bodyB.label === 'crate') {
        const feature = Feature.features.get(pair.bodyB.id) as Crate
        if (feature != null) {
          feature.dent()
        }
      }
    }

    if (pair.bodyA.label === 'crate' && pair.bodyB.label === 'character') {
      const feature = Feature.features.get(pair.bodyA.id) as Crate
      if (feature != null) {
        feature.dent()
      }
    }
  })
})
