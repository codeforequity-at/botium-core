const util = require('util')
const express = require('express')
const bodyParser = require('body-parser')
const http = require('http')
const ioSocket = require('socket.io')
const ioAuth = require('socketio-auth')
const swaggerUi = require('swagger-ui-express')
const debug = require('debug')('botium-core-agent')

const Events = require('../../Events')
const workerpool = require('./agentworkerpool')

const port = process.env.PORT || 46100
const apiToken = process.env.BOTIUM_API_TOKEN || ''
if (!apiToken) {
  console.log('WARNING: BOTIUM_API_TOKEN not set, all clients will be accepted')
} else {
  console.log('Add BOTIUM_API_TOKEN header to all HTTP requests, or BOTIUM_API_TOKEN URL parameter')
}

const app = express()
const server = http.Server(app)
const io = ioSocket(server)

app.use(bodyParser.json())
app.use(bodyParser.text())
app.use(bodyParser.urlencoded({ extended: false }))
app.use('/api/*', (req, res, next) => {
  const clientApiToken = req.headers.BOTIUM_API_TOKEN || req.headers.botium_api_token || req.query.BOTIUM_API_TOKEN || req.query.botium_api_token || req.body.BOTIUM_API_TOKEN || req.body.botium_api_token

  if (!apiToken || apiToken === clientApiToken) {
    next()
  } else {
    debug('agent client not authenticated, wrong api token or api token not given')
    const err = new Error('apiToken invalid')
    err.code = 401
    next(err)
  }
})
app.use('/', require('./routes'))
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(require('./swagger.json')))
app.use((err, req, res, next) => {
  debug(`request failed: ${err}`)

  if (err.message) res.statusMessage = err.message

  res.status(err.code || 500)
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
    const clientApiToken = data.apiToken

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
      socket.emit(Events.TOOMUCHWORKERS_ERROR, 'Maximum worker count exceeded')
      socket.disconnect(true)
    })
})

server.listen(port, () => {
  console.log('Swagger UI available at /api-docs')
  console.log('Swagger definition available at /swagger.json')
  console.log(`listening on *:${port}`)
})
