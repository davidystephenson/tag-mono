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
import DebugCircle from '../shared/DebugCircle'
import Waypoint from './model/Waypoint'
import DebugLabel from '../shared/DebugLabel'

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
  setInterval(tick, 50)
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

const MAP_SIZE = 1500
const wallProps = [
  { x: 0, y: MAP_SIZE, width: 2 * MAP_SIZE, height: 15 },
  { x: 0, y: -MAP_SIZE, width: 2 * MAP_SIZE, height: 15 },
  { x: MAP_SIZE, y: 0, width: 15, height: 2 * MAP_SIZE },
  { x: -MAP_SIZE, y: 0, width: 15, height: 2 * MAP_SIZE }
]
wallProps.forEach(props => new Wall({ ...props, waypoints: false }))

void new Wall({ x: 1000, y: -1100, width: 800, height: 500 })
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
void new Wall({ x: -300, y: -500, width: 100, height: 100 })
void new Wall({ x: -140, y: -500, width: 100, height: 100 })
void new Wall({ x: 400, y: -500, width: 200, height: 500 })
void new Wall({ x: -1100, y: 400, width: 200, height: 500 })
void new Wall({ x: 0, y: -200, width: 100, height: 100 })
void new Wall({ x: 1000, y: 200, width: 200, height: 1500 })
void new Wall({ x: -400, y: 600, width: 1000, height: 1000 })
void new Wall({ x: 450, y: 700, width: 200, height: 800 })
void new Wall({ x: -800, y: 1300, width: 400, height: 200 })
void new Wall({ x: 300, y: 1300, width: 800, height: 200 })
void new Wall({ x: -1250, y: 1300, width: 200, height: 50 })

const edgePadding = 30
const size = MAP_SIZE - edgePadding
const stepSize = size / 4
const gridSteps = Math.ceil(2 * size / stepSize)
for (const i of Array(gridSteps + 1).keys()) {
  for (const j of Array(gridSteps + 1).keys()) {
    const x = edgePadding - MAP_SIZE + i * stepSize
    const y = edgePadding - MAP_SIZE + j * stepSize
    void new Waypoint({ x, y })
  }
}

Waypoint.waypoints.forEach(waypoint => { waypoint.distances = Waypoint.waypoints.map(() => Infinity) })
Waypoint.waypoints.forEach(waypoint => waypoint.setNeighbors())
Waypoint.waypoints.forEach(() => Waypoint.waypoints.forEach(waypoint => waypoint.updateDistances()))
Waypoint.waypoints.forEach(waypoint => waypoint.setPaths())
if (DebugLabel.WAYPOINTS) {
  Waypoint.waypoints.forEach(waypoint => new DebugLabel({
    x: waypoint.x, y: waypoint.y, text: waypoint.id.toString(), color: 'white'
  }))
}

console.log('navigation complete')

void new Crate({ x: 200, y: -1200, height: 500, width: 10 })
void new Crate({ x: -0, y: -900, height: 300, width: 100 })
void new Crate({ x: -800, y: -800, height: 300, width: 200 })
void new Crate({ x: -800, y: -200, height: 300, width: 200 })
void new Crate({ x: -500, y: -200, height: 300, width: 200 })
void new Crate({ x: -30, y: -30, height: 20, width: 20 })
void new Crate({ x: 30, y: -30, height: 20, width: 20 })
void new Crate({ x: 0, y: -30, height: 20, width: 20 })
void new Crate({ x: 0, y: -30, height: 20, width: 100 })
void new Crate({ x: 30, y: 0, height: 30, width: 50 })
void new Crate({ x: -30, y: 0, height: 50, width: 30 })
void new Crate({ x: -800, y: 0, height: 80, width: 30 })
void new Crate({ x: -900, y: 0, height: 50, width: 50 })
void new Crate({ x: -1000, y: 0, height: 50, width: 50 })
void new Crate({ x: -1100, y: 0, height: 90, width: 80 })
void new Crate({ x: -1200, y: 0, height: 50, width: 50 })
void new Crate({ x: -1300, y: 0, height: 50, width: 50 })
void new Crate({ x: -1400, y: 0, height: 50, width: 50 })
void new Crate({ x: 0, y: 30, height: 20, width: 20 })
void new Crate({ x: 30, y: 30, height: 20, width: 20 })
void new Crate({ x: -30, y: 30, height: 20, width: 20 })
void new Crate({ x: 800, y: 200, height: 200, width: 100 })
void new Crate({ x: 500, y: 1400, height: 200, width: 100 })
void new Crate({ x: -500, y: 1400, height: 100, width: 200 })
void new Crate({ x: -1300, y: 1300, height: 200, width: 10 })
void new Crate({ x: 750, y: 1300, height: 200, width: 10 })
void new Crate({ x: 800, y: 1300, height: 200, width: 10 })
void new Crate({ x: 850, y: 1300, height: 200, width: 10 })
void new Crate({ x: 900, y: 1300, height: 200, width: 10 })
void new Crate({ x: 950, y: 1300, height: 200, width: 10 })
void new Crate({ x: 1000, y: 1300, height: 200, width: 10 })
void new Crate({ x: 1050, y: 1300, height: 200, width: 10 })
void new Crate({ x: 1100, y: 1300, height: 200, width: 10 })
void new Crate({ x: 1150, y: 1300, height: 100, width: 10 })
void new Crate({ x: 1200, y: 1300, height: 200, width: 20 })
void new Crate({ x: 1250, y: 1300, height: 200, width: 10 })
void new Crate({ x: 1300, y: 1300, height: 300, width: 10 })
void new Crate({ x: 1350, y: 1300, height: 200, width: 10 })
void new Crate({ x: 1400, y: 1300, height: 200, width: 10 })
void new Crate({ x: 1450, y: 1300, height: 200, width: 10 })
// void new Puppet({
//   x: -300,
//   y: -30,
//   vertices: [
//     { x: 0, y: 50 },
//     { x: -50, y: -50 },
//     { x: 50, y: -50 }
//   ]
// })
// void new Puppet({
//   x: 0,
//   y: -300,
//   vertices: [
//     { x: 0, y: 20 },
//     { x: -20, y: -20 },
//     { x: 20, y: -20 }
//   ],
//   direction: SOUTH_VECTOR,
//   force: 0.05
// })
// void new Puppet({
//   x: 300,
//   y: 0,
//   vertices: [
//     { x: 0, y: 30 },
//     { x: -30, y: -30 },
//     { x: 30, y: -30 }
//   ],
//   direction: WEST_VECTOR
// })
//
// void new Puppet({
//   x: 300,
//   y: 500,
//   vertices: [
//     { x: 0, y: 100 },
//     { x: -100, y: -100 },
//     { x: 100, y: -100 }
//   ],
//   direction: NORTH_VECTOR,
//   force: 0.05
// })
// void new Puppet({
//   x: 800,
//   y: 500,
//   vertices: [
//     { x: 0, y: 100 },
//     { x: -150, y: -50 },
//     { x: 100, y: -100 }
//   ],
//   direction: NORTH_VECTOR,
//   force: 0.15
// })

console.log('Start Bot')

Waypoint.waypoints.forEach(waypoint => {
  void new Bot({ x: waypoint.x, y: waypoint.y })
})
// void new Bot({ x: 500, y: 500 })
// void new Bot({ x: -500, y: -500 })
// void new Bot({ x: 500, y: -500 })
// void new Bot({ x: -500, y: 500 })
// void new Bot({ x: 800, y: 800 })
// void new Bot({ x: -800, y: -800 })
// void new Bot({ x: 800, y: -800 })
// void new Bot({ x: -800, y: 450 })
// void new Bot({ x: -850, y: 450 })
// void new Bot({ x: -800, y: 500 })
// void new Bot({ x: -850, y: 500 })
// void new Bot({ x: -800, y: 550 })
// void new Bot({ x: -850, y: 550 })
// void new Bot({ x: -800, y: 600 })
// void new Bot({ x: -850, y: 600 })
// void new Bot({ x: -800, y: 650 })
// void new Bot({ x: -850, y: 650 })
// void new Bot({ x: -800, y: 700 })
// void new Bot({ x: -850, y: 700 })
// void new Bot({ x: -800, y: 750 })
// void new Bot({ x: -850, y: 750 })
// void new Bot({ x: -800, y: 800 })
// void new Bot({ x: -850, y: 800 })
// void new Bot({ x: -850, y: 850 })
// void new Bot({ x: -800, y: 900 })
// void new Bot({ x: -850, y: 900 })
// void new Bot({ x: -800, y: 950 })
// void new Bot({ x: -850, y: 950 })
// void new Bot({ x: -800, y: 1000 })
// void new Bot({ x: -850, y: 1000 })

console.log('Bot complete')

Matter.Runner.run(runner, engine)

let oldTime = Date.now()
Matter.Events.on(engine, 'afterUpdate', () => {
  if (DEBUG_STEP_TIME) {
    const newTime = Date.now()
    const difference = newTime - oldTime
    if (difference > DEBUG_STEP_TIME_LIMIT) {
      console.log('stepTime', difference)
    }
    oldTime = newTime
  }
  runner.enabled = !Actor.paused
  DebugCircle.circles = Waypoint.waypoints.map(waypoint => new DebugCircle({
    x: waypoint.x,
    y: waypoint.y,
    radius: 5,
    color: 'purple'
  }))
  DebugLine.lines = []
  Actor.actors.forEach(actor => actor.act())
})

Matter.Events.on(engine, 'collisionStart', event => {
  event.pairs.forEach(pair => {
    // console.log('collide', pair.bodyA.label, pair.bodyB.label)
    if (pair.bodyA.label === 'character' && pair.bodyB.label === 'character') {
      // pair.isActive = false
      // state.paused = true
      const actorA = Actor.actors.get(pair.bodyA.id) as Character
      const actorB = Actor.actors.get(pair.bodyB.id) as Character
      // const bodyA = actorA.feature.body
      // const bodyB = actorB.feature.body
      // console.log('collide actors', bodyA.id, bodyA.label, bodyB.id, bodyB.label)
      if (Character.it === actorA) {
        actorB.makeIt()
      } else if (Character.it === actorB) {
        actorA.makeIt()
      }
    }
  })
})
