import express from 'express'
import path from 'path'
import http from 'http'
import https from 'https'
import config from './config.json'
import fs from 'fs'
import socketIo from 'socket.io'
import { ClientToServerEvents, ServerToClientEvents } from '../shared/socket'
import Stage from './Stage'
const stage = new Stage({
  centerBot: true,
  country: true,
  countryBots: true,
  cornerBots: true,
  debugBotCircles: true,
  debugChase: true,
  debugFeatures: false,
  debugItChoice: true,
  debugNotItChoice: true,
  gridBots: true,
  greek: true,
  greekBots: false,
  midpointBots: true,
  townBots: true,
  wallBots: false,
  waypointBots: false,
  waypointBricks: true,
  wildBricks: true,
  size: 3000,
  town: true
})
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
console.warn('PORT set as', PORT)
server.listen(PORT, () => {
  console.log(`Listening on :${PORT}`)
  setInterval(tick, 30)
})
async function updateClients (): Promise<void> {
  const sockets = await io.fetchSockets()
  sockets.forEach(socket => {
    const message = stage.update(socket.id)

    socket.emit('updateClient', message)
  })
}
function tick (): void {
  void updateClients()
}
io.on('connection', (socket) => {
  stage.join(socket.id)
  socket.on('updateServer', message => {
    stage.control({ id: socket.id, controls: message.controls })
  })
  socket.on('disconnect', () => {
    console.log('disconnect:', socket.id)
    stage.leave(socket.id)
  })
})
