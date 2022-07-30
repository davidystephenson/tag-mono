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
import Character from './model/Character'
import Actor from './model/Actor'
import Crate from './model/Crate'
import Boulder from './model/Boulder'
import Bot from './model/Bot'

/* TO DO:
Circle vs Rectangle vs Polygon stack overflow
endRadius function (Character:78)
Change Actor to Feature
Change Character to Actor
Change Boulder to Puppet (extends Actor)
Player and Bot extend Character
Animate puppets
Lighten puppets
brecht versus avicenna
Label colors
Add boundary walls
MAP_SIZE
Sanitize client input
Make an AI Player
Pathfinding
Random boundary size
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

type Empty = Record<string, never>

const server = makeServer()
const io = new socketIo.Server<ClientToServerEvents, ServerToClientEvents, Empty, Empty>(server)
const PORT = process.env.PORT ?? 3000
server.listen(PORT, () => {
  console.log(`Listening on :${PORT}`)
  setInterval(tick, 100)
})

async function updateClients (): Promise<void> {
  const sockets = await io.fetchSockets()
  const compounds = Matter.Composite.allBodies(engine.world)
  const obstacles = compounds.filter(body =>
    body.parts.find(part => part.label === 'wall')
  )
  const renders = sockets.map(socket => {
    const player = Character.characters.get(socket.id)

    if (player == null) {
      const allShapes = compounds.reduce<Record<string, Shape>>((allShapes, compound) => {
        return compound.parts.slice(1).reduce((allShapes, body) => {
          allShapes[body.id] = new Shape(body)

          return allShapes
        }, allShapes)
      }, {})

      return { socket, shapes: allShapes }
    }

    const visibleCompounds = compounds
      .filter(compound => player.isVisible({ compound: compound, obstacles }))
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
  const player = new Character({ x: 0, y: 0, id: socket.id })
  socket.emit('socketId', socket.id)
  socket.on('updateServer', msg => {
    player.input = msg.input
  })

  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    const player = Character.characters.get(socket.id)
    player?.destroy()
  })
})

const wallPositions = [
  { x: 100, y: 0, width: 15, height: 100 },
  { x: -100, y: 0, width: 15, height: 100 }
]
wallPositions.forEach(position => new Wall(position))

void new Crate({ x: 200, y: 0, radius: 10 })
void new Boulder({
  x: -200,
  y: 0,
  vertices: [
    { x: 0, y: 50 },
    { x: -50, y: -50 },
    { x: 50, y: -50 }
  ]
})
void new Bot({ x: 0, y: 500 })

Matter.Runner.run(runner, engine)

Matter.Events.on(engine, 'afterUpdate', e => {
  runner.enabled = !Character.paused
  Character.characters.forEach(character => character.update())
})

Matter.Events.on(engine, 'collisionStart', event => {
  event.pairs.forEach(pair => {
    if (pair.bodyA.label === 'torso' && pair.bodyB.label === 'torso') {
      // pair.isActive = false
      // state.paused = true
      console.log('collide')
      const fighterA = Actor.actors.get(pair.bodyA.id) as Character
      const fighterB = Actor.actors.get(pair.bodyB.id) as Character
      if (Character.it === fighterA) {
        fighterB.makeIt()
      } else if (Character.it === fighterB) {
        fighterA.makeIt()
      }
    }
  })
})
