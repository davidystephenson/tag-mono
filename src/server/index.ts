import express from 'express'
import path from 'path'
import http from 'http'
import https from 'https'
import fs from 'fs'
import socketIo from 'socket.io'
import Matter from 'matter-js'
import Wall from './model/Wall'
import { engine, runner, engineTimers } from './lib/engine'
import { ClientToServerEvents, ServerToClientEvents } from '../shared/socket'
import config from './config.json'
import DebugLine from '../shared/DebugLine'
import Actor from './model/Actor'
import Bot from './model/Bot'
import Character from './model/Character'
import Player from './model/Player'
import Waypoint from './model/Waypoint'
import DebugCircle from '../shared/DebugCircle'
import { DEBUG } from './lib/debug'
import Game from './model/Game'

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
  const player = new Player({ x: 0, y: -100, socket, observer: true })

  socket.on('updateServer', message => {
    player.controls = message.controls
    if (player.controls.up) {
      Actor.paused = false
      runner.enabled = !Actor.paused
    }
  })

  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    const player = Player.players.get(socket.id)
    if (Character.it === player) Bot.oldest?.makeIt({ predator: Bot.oldest })
    player?.destroy()
  })
})

const WORLD_SIZE = 3000
const WALL_SIZE = WORLD_SIZE * 3
export const wallProps = [
  { x: 0, y: WORLD_SIZE, width: WALL_SIZE, height: WORLD_SIZE },
  { x: 0, y: -WORLD_SIZE, width: WALL_SIZE, height: WORLD_SIZE },
  { x: WORLD_SIZE, y: 0, width: WORLD_SIZE, height: WALL_SIZE },
  { x: -WORLD_SIZE, y: 0, width: WORLD_SIZE, height: WALL_SIZE }
]
wallProps.forEach(props => new Wall({ ...props, waypoints: false }))

void new Game({
  centerBot: true,
  country: true,
  countryBots: true,
  cornerBots: true,
  gridBots: false,
  greek: true,
  greekBots: false,
  midpointBots: true,
  townBots: true,
  waypointBots: false,
  waypointBricks: true,
  wildBricks: true,
  size: 3000,
  town: true
})

Matter.Runner.run(runner, engine)

let oldTime = Date.now()
let warningTime = Date.now()
let warningCount = 0
let warningDifferenceTotal = 0
const warnings10: number[] = []
let initial = true
Matter.Events.on(engine, 'afterUpdate', () => {
  engineTimers.forEach((value, index) => {
    const endTime = value[0]
    const action = value[1]
    if (engine.timing.timestamp > endTime) {
      action()
    }
  })
  Array.from(engineTimers.entries()).forEach(([key, value]) => {
    const endTime = value[0]
    if (engine.timing.timestamp > endTime) {
      engineTimers.delete(key)
    }
  })
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
      warnings10.unshift(warningDifference)
      if (warnings10.length > 10) {
        warnings10.pop()
      }
      const average10 = Math.floor(warnings10.reduce((a, b) => a + b, 0) / warnings10.length)
      console.warn(`Warning ${warningCount}: ${difference}ms (∆${warningDifference}) [μ${average}, 10μ${average10}] <${Bot.botCount} bots>`)
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

Matter.Events.on(engine, 'collisionActive', event => {
  event.pairs.forEach(pair => {
    const actorA = Actor.actors.get(pair.bodyA.id)
    const actorB = Actor.actors.get(pair.bodyB.id)
    const delta = engine.timing.lastDelta
    if (actorA != null) {
      actorA.colliding({ actor: actorB, delta })
    }
    if (actorB != null) {
      actorB.colliding({ actor: actorA, delta })
    }
  })
})

// Actor.paused = true
