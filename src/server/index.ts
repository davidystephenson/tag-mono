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
import Crate from './model/Crate'
import Puppet from './model/Puppet'
import Bot from './model/Bot'
import Character from './model/Character'
import Player from './model/Player'
import DebugCircle from '../shared/DebugCircle'
import Waypoint from './model/Waypoint'

/* TO DO:
Pathfinding (Ignore Offscreen Walls)
Search and Hide
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
  setInterval(tick, 100)
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
  const player = new Player({ x: 0, y: -1050, socket })

  socket.on('updateServer', message => {
    player.controls = message.controls
  })

  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    const player = Player.players.get(socket.id)
    if (Character.it === player) Bot.oldest.makeIt()
    player?.destroy()
  })
})

/*
const MAP_SIZE = 1500
const wallPositions = [
  { x: 0, y: MAP_SIZE, width: 2 * MAP_SIZE, height: 15 },
  { x: 0, y: -MAP_SIZE, width: 2 * MAP_SIZE, height: 15 },
  { x: MAP_SIZE, y: 0, width: 15, height: 2 * MAP_SIZE },
  { x: -MAP_SIZE, y: 0, width: 15, height: 2 * MAP_SIZE }
]
wallPositions.forEach(position => new Wall(position))
*/

void new Wall({ x: 300, y: -1000, width: 700, height: 40 })
void new Wall({ x: -300, y: -900, width: 700, height: 40 })
void new Wall({ x: 300, y: -800, width: 700, height: 40 })
void new Wall({ x: 400, y: 0, width: 200, height: 40 })
void new Wall({ x: -400, y: 0, width: 200, height: 40 })

void new Crate({ x: 1000, y: 0, height: 10, width: 10 })
void new Puppet({
  x: -100,
  y: 0,
  vertices: [
    { x: 0, y: 50 },
    { x: -50, y: -50 },
    { x: 50, y: -50 }
  ]
})
void new Bot({ x: 0, y: 0 })

Wall.wallObstacles.forEach(wallBody => {
  wallBody.vertices.forEach(corner => {
    const direction = Matter.Vector.normalise({
      x: Math.sign(corner.x - wallBody.position.x),
      y: Math.sign(corner.y - wallBody.position.y)
    })
    const away = Matter.Vector.mult(direction, 16)
    const location = Matter.Vector.add(corner, away)
    void new Waypoint({ x: location.x, y: location.y })
  })
})
Waypoint.waypoints.forEach(waypoint => { waypoint.distances = Waypoint.waypoints.map(() => Infinity) })
Waypoint.waypoints.forEach(waypoint => waypoint.setNeighbors())
Waypoint.waypoints.forEach(() => Waypoint.waypoints.forEach(waypoint => waypoint.updateDistances()))

Matter.Runner.run(runner, engine)

Matter.Events.on(engine, 'afterUpdate', () => {
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
    console.log('collide', pair.bodyA.label, pair.bodyB.label)
    if (pair.bodyA.label === 'character' && pair.bodyB.label === 'character') {
      // pair.isActive = false
      // state.paused = true
      const actorA = Actor.actors.get(pair.bodyA.id) as Character
      const actorB = Actor.actors.get(pair.bodyB.id) as Character
      const bodyA = actorA.feature.body
      const bodyB = actorB.feature.body
      console.log('collide actors', bodyA.id, bodyA.label, bodyB.id, bodyB.label)
      if (Character.it === actorA) {
        actorB.makeIt()
      } else if (Character.it === actorB) {
        actorA.makeIt()
      }
    }
  })
})
