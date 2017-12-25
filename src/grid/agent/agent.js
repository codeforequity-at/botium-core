const path = require('path')
const debug = require('debug')('botium-agent')

const port = process.env.PORT || 46100
// const apiToken = process.env.API_TOKEN || ''

const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io', {
  serveClient: true
})(http)

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'views', 'index.html'))
})

app.get('/api/status', (req, res) => {
  const status = {
    software: 'Botium Agent',
    version: require(path.resolve(__dirname, '..', '..', '..', 'package.json')).version
  }
  res.json(status)
})

io.on('connection', (socket) => {
  debug(`agent client connected ${socket.id}`)

  const disconnect = () => {
    debug(`agent client disconnected ${socket.id}`)
  }

  socket.on('disconnect', disconnect)
})

http.listen(port, () => {
  console.log(`listening on *:${port}`)
})
