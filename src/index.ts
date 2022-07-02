import express from 'express'
import path from 'path'
import http from 'http'
import socketIo from 'socket.io'
import Matter from 'matter-js'
import Resurrect from 'resurrect-js'

import { Player, State } from './types'
import { INPUT } from './defaults'

const app = express()
const server = new http.Server(app)
const io = new socketIo.Server(server)
const staticPath = path.join(__dirname, '..', 'dist')
console.log(staticPath)

const state: State = {
  direction: { x: 0, y: 0 }
}

const players = new Map<string, Player>()

app.use(express.static(staticPath))

const resurrect = new Resurrect({ prefix: '$', cleanup: true })

async function updateClients (): Promise<void> {
  const sockets = await io.fetchSockets()
  sockets.forEach(socket => {
    const msg = {
      id: socket.id,
      vertices: torso.vertices.map(({ x, y }) => ({ x, y })),
      wall: wall.vertices.map(({ x, y }) => ({ x, y }))
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
  console.log(`listening on port: ${PORT}!`)
  setInterval(tick, 20)
})
io.on('connection', socket => {
  console.log('socket.id:', socket.id)
  const player: Player = {
    id: socket.id,
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
    state.direction = Matter.Vector.normalise(vector)
  })
})

const engine = Matter.Engine.create()
engine.gravity = { x: 0, y: 0, scale: 1 }
const runner = Matter.Runner.create()

const radius = 15
const x = 0
const y = 0
const angle = 0
const torso = Matter.Bodies.rectangle(x, y, 30, 30)
const composite = Matter.Body.create({ parts: [torso] })
composite.restitution = 0
composite.friction = 0
composite.frictionAir = 0.01
Matter.Body.setCentre(composite, { x, y }, false)
Matter.Body.setInertia(composite, 2 * composite.inertia)
Matter.Body.setAngle(composite, angle)

const wall = Matter.Bodies.rectangle(x + 40, y, 15, 15, { isStatic: false })

const composites = [composite, wall]

Matter.Composite.add(engine.world, composites)
Matter.Runner.run(runner, engine)

Matter.Events.on(engine, 'afterUpdate', e => {
  const force = Matter.Vector.mult(state.direction, 0.00001)
  Matter.Body.applyForce(composite, composite.position, force)
  composite.torque = 0.00
})
