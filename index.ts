import express from 'express'
import path from 'path'
import http from 'http'
import socketIo from 'socket.io'
import Matter from 'matter-js'

const app = express()
const server = new http.Server(app)
const io = new socketIo.Server(server)

app.use(express.static(path.join(__dirname, 'dist')))

const PORT = 3000
server.listen(PORT, () => {
  console.log(`listening on port: ${PORT}!`)
})
