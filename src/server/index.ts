import express from 'express'
import path from 'path'
import http from 'http'
import https from 'https'
import config from './config.json'
import fs from 'fs'
import socketIo from 'socket.io'
import { ClientToServerEvents, ServerToClientEvents } from '../shared/socket'
import Stage from './model/Stage'

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
server.listen(PORT, () => {
  console.log(`Listening on :${PORT}`)
  setInterval(tick, 30)
})

async function updateClients (): Promise<void> {
  const sockets = await io.fetchSockets()
  sockets.forEach(socket => stage.update(socket))
}

function tick (): void {
  void updateClients()
}

const stage = new Stage<ClientToServerEvents, ServerToClientEvents>({
  centerBot: true,
  country: true,
  countryBots: true,
  cornerBots: true,
  gridBots: false,
  greek: true,
  greekBots: false,
  midpointBots: true,
  townBots: true,
  waypointBots: false,
  waypointBricks: true,
  wildBricks: true,
  size: 3000,
  town: true
})

io.on('connection', stage.join)
