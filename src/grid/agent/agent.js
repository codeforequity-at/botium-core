const util = require('util')
const express = require('express')
const bodyParser = require('body-parser')
const http = require('http')
const ioSocket = require('socket.io')
const ioAuth = require('socketio-auth')
const swaggerUi = require('swagger-ui-express')
const debug = require('debug')('botium-agent')

const Events = require('../../Events')
const workerpool = require('./agentworkerpool')

const port = process.env.PORT || 46100
const apiToken = process.env.BOTIUM_API_TOKEN || ''
if (!apiToken) {
  console.log('WARNING: BOTIUM_API_TOKEN not set, all clients will be accepted')
}

const app = express()
const server = http.Server(app)
const io = ioSocket(server)

app.use(bodyParser.json())
app.use(bodyParser.text())
app.use(bodyParser.urlencoded({ extended: false }))
app.use('/', require('./routes'))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(require('./swagger.json')))
app.use((err, req, res, next) => {
  res.status(err.status || 500)
    .json({
      status: 'error',
      message: err.message ? err.message : err
    })
})

app.get('/swagger.json', (req, res) => {
  res.json(require('./swagger.json'))
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
  workerpool.allocate({ socket })
    .then((worker) => {
      debug(`agent client connected ${socket.id}, worker slot ${worker.args.slot}`)
      socket.on('disconnect', () => {
        debug(`agent client disconnected ${socket.id}`)
        workerpool.free(worker)
      })
      socket.on('error', (err) => {
        debug(`agent client error ${socket.id}: ${util.inspect(err)}`)
        workerpool.free(worker)
      })
    })
    .catch(() => {
      socket.emit(Events.TOOMUCHWORKERS_ERROR, `Maximum worker count exceeded`)
      socket.disconnect(true)
    })
})

server.listen(port, () => {
  console.log(`listening on *:${port}`)
})
