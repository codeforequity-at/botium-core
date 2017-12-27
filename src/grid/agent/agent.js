const util = require('util')
const path = require('path')
const express = require('express')
const http = require('http')
const ioSocket = require('socket.io')
const ioAuth = require('socketio-auth')
const debug = require('debug')('botium-agent')

const AgentWorker = require('./AgentWorker')
const Defaults = require('../../Defaults')
const Capabilities = require('../../Capabilities')
const Events = require('../../Events')

const port = process.env.PORT || 46100
const apiToken = process.env.BOTIUM_API_TOKEN || ''
if (!apiToken) {
  console.log('WARNING: BOTIUM_API_TOKEN not set, all clients will be accepted')
}

const app = express()
const server = http.Server(app)
const io = ioSocket(server)

const agentWorkers = new Array(process.env.BOTIUM_WORKER_COUNT ? parseInt(process.env.BOTIUM_WORKER_COUNT) : 10)

const capsDefault = {
  [Capabilities.TEMPDIR]: process.env.BOTIUM_TEMPDIR || Defaults.Capabilities[Capabilities.TEMPDIR],
  [Capabilities.CLEANUPTEMPDIR]: true,
  [Capabilities.DOCKERCOMPOSEPATH]: process.env.BOTIUM_DOCKERCOMPOSEPATH || Defaults.Capabilities[Capabilities.DOCKERCOMPOSEPATH],
  [Capabilities.DOCKERUNIQUECONTAINERNAMES]: true,
  [Capabilities.BOTIUMGRIDURL]: ''
}

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'views', 'index.html'))
})

app.get('/api/status', (req, res) => {
  const status = {
    software: 'Botium Agent',
    version: require(path.resolve(__dirname, '..', '..', '..', 'package.json')).version,
    maxWorkers: agentWorkers.length,
    currentWorkers: agentWorkers.filter((wp) => wp).length
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
  const workerSlot = agentWorkers.findIndex((wp) => !wp)
  debug(`agent client connected ${socket.id}, worker slot ${workerSlot}`)

  if (workerSlot < 0) {
    socket.emit(Events.TOOMUCHWORKERS_ERROR, `Maximum worker count exceeded`)
    socket.disconnect(true)
    return
  }

  const workerCaps = Object.assign({}, capsDefault)
  workerCaps[Capabilities.DOCKERSYSLOGPORT] = 47199 + workerSlot
  workerCaps[Capabilities.FACEBOOK_PUBLISHPORT] = 46199 + workerSlot

  const worker = new AgentWorker(workerCaps, socket)
  agentWorkers[workerSlot] = worker
  socket.on('disconnect', () => {
    debug(`agent client disconnected ${socket.id}`)
    agentWorkers[workerSlot] = null
  })
  socket.on('error', (err) => {
    debug(`agent client error ${socket.id}: ${util.inspect(err)}`)
    agentWorkers[workerSlot] = null
  })
})

server.listen(port, () => {
  console.log(`listening on *:${port}`)
})
