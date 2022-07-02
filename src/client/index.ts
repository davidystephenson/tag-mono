import { io } from 'socket.io-client'
import { State, Control, Camera } from './types'
import { Input } from '../types'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const context = canvas.getContext('2d')
if (context == null) throw new Error('No Canvas')
console.log(context)

const controls: Control[] = [
  { key: 'w', input: 'up' },
  { key: 's', input: 'down' },
  { key: 'a', input: 'left' },
  { key: 'd', input: 'right' },
  { key: 'W', input: 'up' },
  { key: 'S', input: 'down' },
  { key: 'A', input: 'left' },
  { key: 'D', input: 'right' },
  { key: 'ArrowUp', input: 'up' },
  { key: 'ArrowDown', input: 'down' },
  { key: 'ArrowLeft', input: 'left' },
  { key: 'ArrowRight', input: 'right' },
  { key: 'Enter', input: 'select' },
  { key: ' ', input: 'select' }
]
const input: Input = {
  up: false,
  down: false,
  left: false,
  right: false,
  select: false
}
const state: State = {
  vertices: [],
  wall: []
}
const camera: Camera = {
  zoom: 0,
  scale: 1,
  x: 0,
  y: 0
}

window.onkeydown = function (e) {
  controls.forEach(control => { if (e.key === control.key) input[control.input] = true })
  console.log(input)
}

window.onkeyup = function (e) {
  controls.forEach(c => { if (e.key === c.key) input[c.input] = false })
}

window.onwheel = function (e) {
  camera.zoom -= 0.001 * e.deltaY
}

const socket = io()

socket.on('updateClient', msg => {
  state.id = msg.id
  state.vertices = msg.vertices
  state.wall = msg.wall
  const reply = {
    id: state.id,
    input
  }
  // @ts-expect-error
  window.state = state
  socket.emit('updateServer', reply)
})

const setupCamera = function (): void {
  camera.scale = Math.exp(camera.zoom)
  console.log('canvas: ', canvas.width, canvas.height)
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

  context.fillStyle = 'Blue'
  context.beginPath()
  state.vertices.forEach(v => context.lineTo(v.x - camera.x, v.y - camera.y))
  context.closePath()
  context.fill()
  context.lineWidth = 1
  context.stroke()

  context.fillStyle = 'Green'
  context.beginPath()
  state.wall.forEach(v => context.lineTo(v.x - camera.x, v.y - camera.y))
  context.closePath()
  context.fill()
  context.lineWidth = 1
  context.stroke()
}
draw()
