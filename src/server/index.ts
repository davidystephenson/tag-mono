import express from 'express'
import path from 'path'
import http from 'http'
import socketIo from 'socket.io'
import Matter from 'matter-js'
import { shapeFactory } from './models/Shape'
import { compounds } from './models/Actor'
import { fighterFactory } from './models/Fighter'
import { Player } from './types'
import { INPUT } from './defaults'
import { wallFactory } from './models/Wall'
import { engine, runner } from './engine'

const app = express()

const staticPath = path.join(__dirname, '..', '..', 'dist')
const staticMiddleware = express.static(staticPath)
app.use(staticMiddleware)

const server = new http.Server(app)
const io = new socketIo.Server(server)

const players = new Map<string, Player>()

async function updateClients (): Promise<void> {
  const sockets = await io.fetchSockets()
  const shapes = compounds.flatMap(compound => compound.parts.slice(1).map(body => shapeFactory(body)))
  sockets.forEach(socket => {
    const msg = { id: socket.id, shapes }
    socket.emit('updateClient', msg)
  })
}

function tick (): void {
  void updateClients()
}

const PORT = process.env.PORT ?? 3000
server.listen(PORT, () => {
  console.log(`Listening on :${PORT}`)
  setInterval(tick, 20)
})
io.on('connection', socket => {
  console.log('connection:', socket.id)
  const player: Player = {
    id: socket.id,
    actor: fighterFactory({ x: 0, y: 0 }),
    direction: { x: 0, y: 0 },
    input: INPUT
  }
  players.set(socket.id, player)
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
    players.delete(socket.id)
  })
})

wallFactory({ x: 100, y: 0, width: 15, height: 40 })
wallFactory({ x: -100, y: 0, width: 15, height: 40 })

Matter.Composite.add(engine.world, compounds)
Matter.Runner.run(runner, engine)

Matter.Events.on(engine, 'afterUpdate', e => {
  players.forEach(player => {
    if (player.actor != null) {
      const force = Matter.Vector.mult(player.direction, 0.00005)
      Matter.Body.applyForce(player.actor.compound, player.actor.compound.position, force)
    }
  })
})
