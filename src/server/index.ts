import express from 'express'
import path from 'path'
import http from 'http'
import https from 'https'
import fs from 'fs'
import socketIo from 'socket.io'
import Matter from 'matter-js'
import Player from './model/Player'
import Wall from './model/Wall'
import Shape from '../shared/Shape'
import { engine, runner } from './lib/engine'
import { ClientToServerEvents, ServerToClientEvents } from '../shared/socket'
import config from './config.json'
import DebugLine from '../shared/DebugLine'
import Fighter from './model/Fighter'
import Actor from './model/Actor'

console.log('config:', config)

/* TO DO:
Make Dynamic Crate
Make an AI Player
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
  console.log(`Listening on :${PORT} TEST3`)
  setInterval(tick, 100)
})

async function updateClients (): Promise<void> {
  const sockets = await io.fetchSockets()
  const compounds = Matter.Composite.allBodies(engine.world)
  const obstacles = compounds.filter(body =>
    body.parts.find(part => part.label === 'wall')
  )
  const renders = sockets.map(socket => {
    const player = Player.players.get(socket.id)

    if (player == null) {
      const allShapes = compounds
        .flatMap(compound => compound.parts.slice(1).map(body => new Shape(body)))

      return { socket, shapes: allShapes }
    }

    const visibleCompounds = compounds
      .filter(compound => player.isVisible(compound, obstacles))
    const shapeList = visibleCompounds
      .flatMap(compound => compound.parts.slice(1).map(body => new Shape(body)))
    const shapes = shapeList.reduce<Record<string, Shape>>((shapes, shape) => {
      shapes[shape.id] = shape

      return shapes
    }, {})

    return { socket, shapes, torsoId: player.torso.id }
  })
  renders.forEach(render => {
    const message = { shapes: render.shapes, debugLines: DebugLine.lines, torsoId: render.torsoId }
    render.socket.emit('updateClient', message)
  })
}

function tick (): void {
  void updateClients()
  DebugLine.lines = []
}

io.on('connection', socket => {
  console.log('connection:', socket.id)
  const player = new Player({ x: 0, y: 0, socketId: socket.id })
  if (Player.players.size === 1) player.makeIt()
  socket.emit('socketId', socket.id)
  socket.on('updateServer', msg => {
    player.input = msg.input
    const vector = { x: 0, y: 0 }
    if (player.input.up) vector.y += -1
    if (player.input.down) vector.y += 1
    if (player.input.left) vector.x += -1
    if (player.input.right) vector.x += 1
    player.direction = Matter.Vector.normalise(vector)
  })

  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    const player = Player.players.get(socket.id)
    player?.destroy()
  })
})

const wallPositions = [
  { x: 100, y: 0, width: 15, height: 100 },
  { x: -100, y: 0, width: 15, height: 100 }
]
wallPositions.forEach(position => new Wall(position))

Matter.Runner.run(runner, engine)

Matter.Events.on(engine, 'afterUpdate', e => {
  runner.enabled = !Player.paused
  Player.players.forEach(player => {
    const force = Matter.Vector.mult(player.direction, 0.00005)
    Matter.Body.applyForce(player.compound, player.compound.position, force)
  })
})

Matter.Events.on(engine, 'collisionStart', event => {
  event.pairs.forEach(pair => {
    if (pair.bodyA.label === 'torso' && pair.bodyB.label === 'torso') {
      // pair.isActive = false
      // state.paused = true
      console.log('collide')
      const fighterA = Actor.actors.get(pair.bodyA.id) as Fighter
      const fighterB = Actor.actors.get(pair.bodyB.id) as Fighter
      if (Fighter.it === fighterA) {
        fighterB.makeIt()
      } else if (Fighter.it === fighterB) {
        fighterA.makeIt()
      }
    }
  })
})
