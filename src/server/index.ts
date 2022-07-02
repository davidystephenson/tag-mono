import express from 'express'
import path from 'path'
import http from 'http'
import socketIo from 'socket.io'
import Matter from 'matter-js'
import { shapeFactory } from './models/Shape'
import { compounds } from './models/Actor'
import { fighterFactory } from './models/Fighter'
import { Player, State } from './types'
import { INPUT } from './defaults'
import { wallFactory } from './models/Wall'

const app = express()

const staticPath = path.join(__dirname, '..', '..', 'dist')
const staticMiddleware = express.static(staticPath)
app.use(staticMiddleware)

const server = new http.Server(app)
const io = new socketIo.Server(server)

const players = new Map<string, Player>()
const state: State = {
  direction: { x: 0, y: 0 }
}

async function updateClients (): Promise<void> {
  const sockets = await io.fetchSockets()
  const shapes = compounds.flatMap(compound => compound.parts.map(body => shapeFactory(body)))
  sockets.forEach(socket => {
    const msg = {
      id: socket.id,
      shapes
    }
    socket.emit('updateClient', msg)
  })
}

function tick (): void {
  void updateClients()
  // console.log('position:', composite.position.x, composite.position.y)
  // console.log('direction:', state.direction.x, state.direction.y)
  // console.log('direction:', state.direction.x, state.direction.y)
  // console.log('angle:', composite.angle)
}

const PORT = 3000
server.listen(PORT, () => {
  console.log(`Listening on :${PORT} TEST3`)
  setInterval(tick, 20)
})
io.on('connection', socket => {
  console.log('connection:', socket.id)
  const player: Player = {
    id: socket.id,
    input: INPUT
  }
  players.set(socket.id, player)
  socket.on('updateServer', msg => {
    player.input = msg.input
    const vector = { x: 0, y: 0 }
    if (player.input.up) {
      console.log('up:', socket.id)
      vector.y += -1
    }
    if (player.input.down) {
      console.log('down:', socket.id)
      vector.y += 1
    }
    if (player.input.left) {
      console.log('left:', socket.id)
      vector.x += -1
    }
    if (player.input.right) {
      console.log('right:', socket.id)
      vector.x += 1
    }
    state.direction = Matter.Vector.normalise(vector)
  })

  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    players.delete(socket.id)
  })
})

const engine = Matter.Engine.create()
engine.gravity = { x: 0, y: 0, scale: 1 }
const runner = Matter.Runner.create()

const fighter = fighterFactory({ x: 0, y: 0 })
wallFactory({ x: 40, y: 0, width: 15, height: 40 })

Matter.Composite.add(engine.world, compounds)
Matter.Runner.run(runner, engine)

Matter.Events.on(engine, 'afterUpdate', e => {
  const force = Matter.Vector.mult(state.direction, 0.00005)
  Matter.Body.applyForce(fighter.compound, fighter.compound.position, force)
  fighter.compound.torque = 0.00
})
