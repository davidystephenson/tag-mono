import express from 'express'
import path from 'path'
import http from 'http'
import https from 'https'
import fs from 'fs'
import socketIo from 'socket.io'
import Matter from 'matter-js'
import Wall from './model/Wall'
import Shape from '../shared/Shape'
import { engine, runner } from './lib/engine'
import { ClientToServerEvents, ServerToClientEvents } from '../shared/socket'
import config from './config.json'
import DebugLine from '../shared/DebugLine'
import Actor from './model/Actor'
import Crate from './model/Crate'
import Puppet from './model/Puppet'
import Bot from './model/Bot'
import Character from './model/Character'
import Player from './model/Player'

/* TO DO:
Add boundary walls
MAP_SIZE
Random boundary size
Sanitize client input
Make the AI flee
AI Reconnection
Pathfinding
Random starting internal obstacles
Generate AI players
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
  setInterval(tick, 100)
})

async function updateClients (): Promise<void> {
  const sockets = await io.fetchSockets()
  const compounds = Matter.Composite.allBodies(engine.world)
  const obstacles = compounds.filter(body =>
    body.parts.find(part => part.label !== 'torso')
  )
  sockets.forEach(socket => {
    const player = Player.players.get(socket.id)

    if (player == null) {
      const shapes = Shape.fromCompounds(compounds)
      const message = { shapes, debugLines: DebugLine.lines }

      socket.emit('updateClient', message)
    } else {
      player.updateClient({ compounds, obstacles })
    }
  })
}

function tick (): void {
  void updateClients()
  DebugLine.lines = []
}

io.on('connection', socket => {
  console.log('connection:', socket.id)
  socket.emit('socketId', socket.id)
  const player = new Player({ x: 0, y: 0, socket })

  socket.on('updateServer', message => {
    player.controls = message.controls
  })

  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    const player = Player.players.get(socket.id)

    player?.destroy()
  })
})

const MAP_SIZE = 1500
const wallPositions = [
  { x: 0, y: MAP_SIZE, width: 2 * MAP_SIZE, height: 15 },
  { x: 0, y: -MAP_SIZE, width: 2 * MAP_SIZE, height: 15 },
  { x: MAP_SIZE, y: 0, width: 15, height: 2 * MAP_SIZE },
  { x: -MAP_SIZE, y: 0, width: 15, height: 2 * MAP_SIZE }
]
wallPositions.forEach(position => new Wall(position))

void new Wall({ x: 0, y: 0, width: 15, height: 0.5 * MAP_SIZE })

void new Crate({ x: 1000, y: 0, radius: 10 })
void new Puppet({
  x: -100,
  y: 0,
  vertices: [
    { x: 0, y: 50 },
    { x: -50, y: -50 },
    { x: 50, y: -50 }
  ]
})
void new Bot({ x: 0, y: 500 })

Matter.Runner.run(runner, engine)

Matter.Events.on(engine, 'afterUpdate', () => {
  runner.enabled = !Actor.paused

  Actor.actors.forEach(actor => actor.act())
})

Matter.Events.on(engine, 'collisionStart', event => {
  event.pairs.forEach(pair => {
    if (pair.bodyA.label === 'torso' && pair.bodyB.label === 'torso') {
      // pair.isActive = false
      // state.paused = true
      console.log('collide')
      const actorA = Actor.actors.get(pair.bodyA.id) as Character
      const actorB = Actor.actors.get(pair.bodyB.id) as Character
      if (Character.it === actorA) {
        actorB.makeIt()
      } else if (Character.it === actorB) {
        actorA.makeIt()
      }
    }
  })
})
