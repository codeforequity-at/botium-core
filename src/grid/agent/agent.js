const path = require('path')
const debug = require('debug')('botium-agent')
const express = require('express')
const http = require('http')
const ioSocket = require('socket.io')
const ioAuth = require('socketio-auth')

const AgentWorker = require('./AgentWorker')
const Defaults = require('../../Defaults')
const Capabilities = require('../../Capabilities')

const port = process.env.PORT || 46100
const apiToken = process.env.API_TOKEN || ''
if (!apiToken) {
  console.log('WARNING: API_TOKEN not set, all clients will be accepted')
}

const app = express()
const server = http.Server(app)
const io = ioSocket(server)

const agentWorkers = {}

const capsDefault = {
  [Capabilities.TEMPDIR]: process.env.BOTIUM_TEMPDIR || Defaults.Capabilities[Capabilities.TEMPDIR],
  [Capabilities.CLEANUPTEMPDIR]: true,
  [Capabilities.DOCKERCOMPOSEPATH]: process.env.BOTIUM_DOCKERCOMPOSEPATH || Defaults.Capabilities[Capabilities.DOCKERCOMPOSEPATH],
  [Capabilities.DOCKERUNIQUECONTAINERNAMES]: true,
  [Capabilities.DOCKERSYSLOGPORT_RANGE]: Defaults.Capabilities[Capabilities.DOCKERSYSLOGPORT_RANGE],
  [Capabilities.FACEBOOK_PUBLISHPORT_RANGE]: Defaults.Capabilities[Capabilities.FACEBOOK_PUBLISHPORT_RANGE]
}

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'views', 'index.html'))
})

app.get('/api/status', (req, res) => {
  const status = {
    software: 'Botium Agent',
    version: require(path.resolve(__dirname, '..', '..', '..', 'package.json')).version,
    workers: Object.keys(agentWorkers).length
  }
  res.json(status)
})

ioAuth(io, {
  authenticate: (socket, data, callback) => {
    debug(`agent client authenticate ${socket.id} - ${JSON.stringify(data)} ...`)
    var clientApiToken = data.apiToken

    if (!apiToken || apiToken === clientApiToken) {
      debug(`agent client authenticated ${socket.id}`)
      return callback(null, true)
    } else {
      debug(`agent client not authenticated ${socket.id}`)
      return callback(new Error('apiToken invalid'))
    }
  }
})

io.on('connection', (socket) => {
  debug(`agent client connected ${socket.id}`)
  const worker = new AgentWorker(capsDefault, socket)
  agentWorkers[socket.id] = worker
  socket.on('disconnect', () => {
    debug(`agent client disconnected ${socket.id}`)
    delete agentWorkers[socket.id]
  })
  socket.on('error', (err) => {
    debug(`agent client error ${socket.id}: ${JSON.stringify(err)}`)
    delete agentWorkers[socket.id]
  })
})

server.listen(port, () => {
  console.log(`listening on *:${port}`)
})
