const io = require('socket.io-client')

const socket = io('http://127.0.0.1:46100')

socket.on('connect', () => {
  console.log('connect')
  socket.emit('authentication', { apiToken: '123123123' })
})
socket.on('authenticated', () => {
  console.log('authenticated')
  socket.emit('BUILD_CONTAINER',
    {
      PROJECTNAME: 'Botium Echo',
      CONTAINERMODE: 'echo'
    },
    {
    },
    {
    })
})
socket.on('CONTAINER_BUILT', () => {
  console.log('CONTAINER_BUILT')
  socket.emit('START_CONTAINER')
})
socket.on('CONTAINER_STARTED', () => {
  console.log('CONTAINER_STARTED')
  socket.emit('SENDTOBOT', { messageText: 'Hallo!' })
})
socket.on('MESSAGE_RECEIVEDFROMBOT', (msg) => {
  console.log(`MESSAGE_RECEIVEDFROMBOT ${JSON.stringify(msg)}`)
  socket.emit('STOP_CONTAINER')
})
socket.on('CONTAINER_STOPPED', () => {
  console.log('CONTAINER_STOPPED')
  socket.emit('CLEAN_CONTAINER')
})
socket.on('CONTAINER_CLEANED', () => {
  console.log('CONTAINER_CLEANED')
  process.exit(0)
})

socket.on('unauthorized', (err) => {
  console.log(`unauthorized ${JSON.stringify(err)}`)
  process.exit(1)
})
socket.on('TOOMUCHWORKERS_ERROR', (err) => {
  console.log(`TOOMUCHWORKERS_ERROR ${JSON.stringify(err)}`)
  process.exit(1)
})
socket.on('CONTAINER_BUILD_ERROR', (err) => {
  console.log(`CONTAINER_BUILD_ERROR ${JSON.stringify(err)}`)
  process.exit(1)
})
socket.on('CONTAINER_START_ERROR', (err) => {
  console.log(`CONTAINER_START_ERROR ${JSON.stringify(err)}`)
  process.exit(1)
})
socket.on('CONTAINER_STOP_ERROR', (err) => {
  console.log(`CONTAINER_START_ERROR ${JSON.stringify(err)}`)
  process.exit(1)
})
socket.on('CONTAINER_CLEAN_ERROR', (err) => {
  console.log(`CONTAINER_CLEAN_ERROR ${JSON.stringify(err)}`)
  process.exit(1)
})
