import { io, Socket } from 'socket.io-client'
import Camera from './Camera'
import Input from '../shared/Input'
import Matter from 'matter-js'
import { ClientToServerEvents, ServerToClientEvents } from '../shared/socket'
import VISION from '../shared/VISION'
import Shape from '../shared/Shape'
import State from './State'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const context = canvas.getContext('2d')
if (context == null) throw new Error('No Canvas')

const input = new Input()
const state = new State()
const camera = new Camera()
let locked = true

let oldTime = Date.now()
window.onclick = function () {
  const newTime = Date.now()
  const dt = newTime - oldTime
  console.debug('dt:', dt)
  oldTime = newTime
  console.debug('state:', state)
  console.debug('camera:', camera)
  socket.emit('debug', {})
}

window.onkeydown = function (event: KeyboardEvent) {
  input.take({ key: event.key, value: true })
}

window.onkeyup = function (event: KeyboardEvent) {
  input.take({ key: event.key, value: false })

  if (event.key === 'Enter') {
    locked = false
  }
}

window.onwheel = function (event: WheelEvent) {
  if (!locked) {
    camera.zoom -= 0.001 * event.deltaY
  }
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
      stateShape.circleRadius = messageShape.circleRadius
      stateShape.x = messageShape.x
      stateShape.y = messageShape.y
      stateShape.render = messageShape.render
      stateShape.vertices = messageShape.vertices
      stateShape.deleted = false
      stateShape.alpha = messageShape.alpha
      stateShape.blue = messageShape.blue
      stateShape.green = messageShape.green
      stateShape.red = messageShape.red
      newShapes.set(stateShape.id, stateShape)
    }
  })
  state.shapes = newShapes
  state.circles = message.circles
  state.lines = message.lines
  state.labels = message.labels
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

const BACKGROUND_COLOR = '#0E0E10'
const FOREGROUND_COLOR = '#343434'

function hex (n: number): string {
  const s = n.toString(16)
  return s.length === 1 ? '0' + s : s
}

const draw = function (): void {
  window.requestAnimationFrame(draw)
  setupCamera()
  const w = canvas.width / camera.scale * 100
  const h = canvas.height / camera.scale * 100
  context.fillStyle = BACKGROUND_COLOR
  context.fillRect(-w / 2, -h / 2, w, h)
  context.fillStyle = FOREGROUND_COLOR
  context.fillRect(-VISION.width, -VISION.height, 2 * VISION.width, 2 * VISION.height)
  state.shapes.forEach(shape => {
    context.strokeStyle = shape.render.strokeStyle ?? 'black'
    context.fillStyle = shape.render.fillStyle ?? 'black'
    context.beginPath()
    if (shape.circleRadius == null || shape.circleRadius === 0) {
      shape.ivertices.forEach((v: Matter.Vector) => context.lineTo(v.x - camera.x, v.y - camera.y))
      context.closePath()
    } else {
      context.arc(shape.ix - camera.x, shape.iy - camera.y, shape.circleRadius, 0, 2 * Math.PI)
    }
    context.fill()
    context.lineWidth = 2
    context.stroke()
    if (shape.circleRadius != null && shape.circleRadius > 0) {
      context.fillStyle = shape.green === 255 && shape.blue === 255
        ? 'black'
        : 'white'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.font = '10px sans'
      context.fillText(hex(shape.red), shape.ix - camera.x, shape.iy - camera.y - 9)
      context.fillText(hex(shape.green), shape.ix - camera.x, shape.iy - camera.y + 1)
      context.fillText(hex(shape.blue), shape.ix - camera.x, shape.iy - camera.y + 11)
    }
  })
  state.circles.forEach(circle => {
    context.fillStyle = circle.color
    context.beginPath()
    context.arc(circle.x - camera.x, circle.y - camera.y, circle.radius, 0, 2 * Math.PI)
    context.fill()
  })
  state.lines.forEach(line => {
    context.strokeStyle = line.color
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(line.start.x - camera.x, line.start.y - camera.y)
    context.lineTo(line.end.x - camera.x, line.end.y - camera.y)
    context.stroke()
  })
  state.labels.forEach(label => {
    context.fillStyle = label.color
    context.lineWidth = 4
    const red = 'rgba(255, 0, 0, 0.5)'
    context.font = label.color === red ? '28px sans' : '14px sans'
    const offsetY = label.color === red ? 25 + Math.random() * 10 : 0
    context.fillText(label.text, label.x - camera.x, label.y - camera.y - offsetY + 1)
  })
}
draw()

const lerp = 0.6
const lerpLess = 1 - lerp
function tick (): void {
  state.shapes.forEach(shape => {
    if (!(shape.circleRadius == null || shape.circleRadius === 0)) {
      shape.ix = lerp * shape.x + lerpLess * shape.ix
      shape.iy = lerp * shape.y + lerpLess * shape.iy
    } else {
      shape.vertices.forEach((vertex, i) => {
        shape.ivertices[i].x = lerp * vertex.x + lerpLess * shape.ivertices[i].x
        shape.ivertices[i].y = lerp * vertex.y + lerpLess * shape.ivertices[i].y
      })
    }
    if (shape.id === state.torsoId) {
      camera.x = shape.ix
      camera.y = shape.iy
    }
  })
}

setInterval(tick, 10)
