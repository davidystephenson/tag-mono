import express from 'express'
import path from 'path'
import http from 'http'
import https from 'https'
import fs from 'fs'
import socketIo from 'socket.io'
import Matter from 'matter-js'
import Player, { players } from './model/Player'
import Wall from './model/Wall'
import Shape from '../shared/Shape'
import Input from '../shared/Input'
import { engine, runner } from './lib/engine'
import state from './lib/state'
import config from './config.json'

console.log('config:', config)

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

interface ServerToClientEvents {
  updateClient: ({ id, shapes }: {id: string, shapes: Shape[]}) => void
}

interface ClientToServerEvents {
  updateServer: ({ id, input }: {id: string, input: Input}) => void
}

const server = makeServer()
const io = new socketIo.Server<ClientToServerEvents, ServerToClientEvents>(server)
const PORT = process.env.PORT ?? 3000
server.listen(PORT, () => {
  console.log(`Listening on :${PORT} TEST3`)
  setInterval(tick, 20)
})

async function updateClients (): Promise<void> {
  const sockets = await io.fetchSockets()
  const compounds = Matter.Composite.allBodies(engine.world)
  const shapes = compounds.flatMap(compound => compound.parts.slice(1).map(body => new Shape(body)))
  sockets.forEach(socket => {
    const msg = { id: socket.id, shapes }
    socket.emit('updateClient', msg)
  })
}

function tick (): void {
  void updateClients()
}

io.on('connection', socket => {
  console.log('connection:', socket.id)
  const player = new Player({ x: 0, y: 0, socketId: socket.id })
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
    const player = players.get(socket.id)
    if (player != null) {
      Matter.Composite.remove(engine.world, player.compound)
    }
    players.delete(socket.id)
  })
})

const wallPositions = [
  { x: 100, y: 0, width: 15, height: 40 },
  { x: -100, y: 0, width: 15, height: 40 }
]
wallPositions.forEach(position => new Wall(position))

Matter.Runner.run(runner, engine)

Matter.Events.on(engine, 'afterUpdate', e => {
  runner.enabled = !state.paused
  players.forEach(player => {
    const force = Matter.Vector.mult(player.direction, 0.00005)
    Matter.Body.applyForce(player.compound, player.compound.position, force)
  })
})

Matter.Events.on(engine, 'collisionStart', event => {
  event.pairs.forEach(pair => {
    const orderings = [
      [pair.bodyA, pair.bodyB],
      [pair.bodyB, pair.bodyA]
    ]
    orderings.forEach(bodies => {
      const labels = bodies.map(body => body.label)
      if (labels[0] === 'torso' && labels[1] === 'torso') {
        pair.isActive = true
        // state.paused = true
      }
    })
  })
})
