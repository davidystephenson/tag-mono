import { io, Socket } from 'socket.io-client'
import Camera from './model/Camera'
import State from './model/State'
import Input from '../shared/Input'
import Matter from 'matter-js'
import { ClientToServerEvents, ServerToClientEvents } from '../shared/socket'
import VISION from '../shared/VISION'
import Shape from '../shared/Shape'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const context = canvas.getContext('2d')
if (context == null) throw new Error('No Canvas')

const input = new Input()
const state = new State()
const camera = new Camera()

window.onclick = function () {
  console.log('state:', state)
  console.log('camera:', camera)
}

window.onkeydown = function (event: KeyboardEvent) {
  input.take({ key: event.key, value: true })
}

window.onkeyup = function (event: KeyboardEvent) {
  input.take({ key: event.key, value: false })
}

window.onwheel = function (event: WheelEvent) {
  camera.zoom -= 0.001 * event.deltaY
}

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io()

socket.on('socketId', id => {
  state.id = id
})

socket.on('updateClient', message => {
  state.torsoId = message.torsoId

  const newShapes = new Map<number, Shape>()
  Object.values(message.shapes).forEach(messageShape => {
    const stateShape = state.shapes.get(messageShape.id)
    if (stateShape == null) {
      newShapes.set(messageShape.id, messageShape)
    } else {
      stateShape.x = messageShape.x
      stateShape.y = messageShape.y
      stateShape.render = messageShape.render
      stateShape.vertices = messageShape.vertices
      stateShape.deleted = false
      newShapes.set(stateShape.id, stateShape)
    }
  })
  state.shapes = newShapes
  state.debugCircles = message.debugCircles
  state.debugLines = message.debugLines
  state.debugLabels = message.debugLabels
  const reply = {
    id: state.id,
    controls: input.controls
  }
  socket.emit('updateServer', reply)
})

const setupCamera = function (): void {
  camera.scale = Math.exp(camera.zoom) * 0.9
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
  context.fillStyle = 'Gray'
  context.fillRect(-VISION.width, -VISION.height, 2 * VISION.width, 2 * VISION.height)
  state.shapes.forEach(shape => {
    context.fillStyle = shape.render.fillStyle ?? 'black'
    context.beginPath()
    if (shape.circleRadius == null || shape.circleRadius === 0) {
      shape.ivertices.forEach((v: Matter.Vector) => context.lineTo(v.x - camera.x, v.y - camera.y))
      context.closePath()
    } else {
      context.arc(shape.ix - camera.x, shape.iy - camera.y, shape.circleRadius, 0, 2 * Math.PI)
    }
    context.fill()
    context.lineWidth = 1
    context.stroke()
    if (shape.circleRadius != null && shape.circleRadius > 0) {
      const label = context.fillStyle.slice(1)
      context.fillStyle = 'white'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.font = '8px sans'
      context.fillText(label, shape.ix - camera.x, shape.iy - camera.y)
    }
  })
  state.debugCircles.forEach(circle => {
    context.fillStyle = circle.color
    context.beginPath()
    context.arc(circle.x - camera.x, circle.y - camera.y, circle.radius, 0, 2 * Math.PI)
    context.fill()
  })
  state.debugLines.forEach(line => {
    context.strokeStyle = line.color
    context.lineWidth = 8
    context.beginPath()
    context.moveTo(line.start.x - camera.x, line.start.y - camera.y)
    context.lineTo(line.end.x - camera.x, line.end.y - camera.y)
    context.stroke()
  })
  state.debugLabels.forEach(label => {
    context.fillStyle = label.color
    context.lineWidth = 4
    context.font = '40px sans'
    context.fillText(label.text, label.x - camera.x, label.y - camera.y)
  })
}
draw()

function tick (): void {
  const lerp = 1
  state.shapes.forEach(shape => {
    if (!(shape.circleRadius == null || shape.circleRadius === 0)) {
      shape.ix = lerp * shape.x + (1 - lerp) * shape.ix
      shape.iy = lerp * shape.y + (1 - lerp) * shape.iy
    } else {
      shape.vertices.forEach((vertex, i) => {
        shape.ivertices[i].x = lerp * vertex.x + (1 - lerp) * shape.ivertices[i].x
        shape.ivertices[i].y = lerp * vertex.y + (1 - lerp) * shape.ivertices[i].y
      })
    }
    if (shape.id === state.torsoId) {
      camera.x = shape.ix
      camera.y = shape.iy
    }
  })
}

setInterval(tick, 10)
