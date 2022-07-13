import { io, Socket } from 'socket.io-client'
import Camera from './model/Camera'
import State from './model/State'
import Input from '../shared/Input'
import Matter from 'matter-js'
import controls from './lib/controls'
import { ClientToServerEvents, ServerToClientEvents } from '../shared/socket'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const context = canvas.getContext('2d')
if (context == null) throw new Error('No Canvas')
console.log(context)

const input = new Input()
const state = new State()
const camera = new Camera()

window.onclick = function () {
  console.log('state:', state)
  console.log('camera:', camera)
}

window.onkeydown = function (event: KeyboardEvent) {
  controls.forEach(control => {
    if (event.key === control.key) input[control.input] = true
  })
}

window.onkeyup = function (event: KeyboardEvent) {
  controls.forEach(c => {
    if (event.key === c.key) input[c.input] = false
  })
}

window.onwheel = function (event: WheelEvent) {
  camera.zoom -= 0.001 * event.deltaY
}

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io()

socket.on('socketId', id => {
  state.id = id
})

socket.on('updateClient', msg => {
  state.torsoId = msg.torsoId
  Object.values(msg.shapes).forEach(shape => {
    if (state.shapes[shape.id] == null) {
      state.shapes[shape.id] = shape
    } else {
      state.shapes[shape.id].x = shape.x
      state.shapes[shape.id].y = shape.y
      state.shapes[shape.id].vertices = shape.vertices
    }
  })

  state.debugLines = msg.debugLines
  console.log(msg)
  const reply = {
    id: state.id,
    input
  }
  socket.emit('updateServer', reply)
})

const setupCamera = function (): void {
  camera.scale = Math.exp(camera.zoom)
  const xScale = camera.scale * canvas.height / 100
  const yScale = camera.scale * canvas.height / 100
  const xTranslate = canvas.width / 2
  const yTranslate = canvas.height / 2
  context.setTransform(yScale, 0, 0, xScale, xTranslate, yTranslate)
}

const draw = function (): void {
  window.requestAnimationFrame(draw)
  setupCamera()
  const w = canvas.width / camera.scale * 100
  const h = canvas.height / camera.scale * 100
  context.clearRect(-w / 2, -h / 2, w, h)
  context.strokeStyle = 'rgba(0,0,0,0.25)'

  Object.values(state.shapes).forEach(shape => {
    context.fillStyle = shape.render.fillStyle ?? 'black'
    context.beginPath()
    if (shape.circleRadius == null || shape.circleRadius === 0) {
      shape.vertices.forEach((v: Matter.Vector) => context.lineTo(v.x - camera.x, v.y - camera.y))
      context.closePath()
    } else {
      context.arc(shape.ix - camera.x, shape.iy - camera.y, shape.circleRadius, 0, 2 * Math.PI)
    }
    context.fill()
    context.lineWidth = 1
    context.stroke()
  })

  state.debugLines.forEach(line => {
    context.strokeStyle = line.color
    context.beginPath()
    context.moveTo(line.start.x - camera.x, line.start.y - camera.y)
    context.lineTo(line.end.x - camera.x, line.end.y - camera.y)
    context.stroke()
  })
}
draw()

function tick (): void {
  const lerp = 0.1
  Object.values(state.shapes).forEach(shape => {
    if (!(shape.circleRadius == null || shape.circleRadius === 0)) {
      shape.ix = lerp * shape.x + (1 - lerp) * shape.ix
      shape.iy = lerp * shape.y + (1 - lerp) * shape.iy
    }
    if (shape.id === state.torsoId) {
      camera.x = shape.ix
      camera.y = shape.iy
    }
  })
}

setInterval(tick, 10)
