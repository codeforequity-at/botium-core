const io = require('socket.io-client')

const socket = io('http://127.0.0.1:46100')

socket.on('connect', () => {
  console.log('connect')
  socket.emit('authentication', { apiToken: '123123123' })

  socket.on('authenticated', () => {
    console.log('authenticated')
  })
  socket.on('unauthorized', (err) => {
    console.log(`unauthorized ${JSON.stringify(err)}`)
    process.exit(1)
  })
})
