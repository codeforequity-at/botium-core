const util = require('util')
const fs = require('fs')
const opn = require('opn')
const path = require('path')
const async = require('async')
const http = require('http')
const socket = require('socket.io')
const debug = require('debug')('botium-WebSpeechContainer')

const Events = require('../Events')
const BaseContainer = require('./BaseContainer')
const BotiumMockMessage = require('../mocks/BotiumMockMessage')

module.exports = class WebSpeechContainer extends BaseContainer {
  Validate () {
    return super.Validate().then(() => {
      // this._AssertCapabilityExists(Capabilities.BOTIUMGRIDURL)
    })
  }

  Build () {
    return new Promise((resolve, reject) => {
      async.series([
        (baseComplete) => {
          super.Build().then(() => baseComplete()).catch(baseComplete)
        },

        (httpServerComplete) => {
          this.httpServer = http.createServer((req, res) => {
            debug('serving html file')
            res.writeHead(200, {
              'Context-Type': 'text/html'
            })
            fs.createReadStream(path.resolve(__dirname, 'WebSpeechContainer.html')).pipe(res)
          })
          this.io = socket(this.httpServer)
          this.io.on('connection', (clientSocket) => {
            debug('browser connected to socket')
            this.clientSocket = clientSocket
            this.clientSocket.on('disconnect', () => {
              debug('browser disconnecteded from socket')
              this.clientSocket = null
            })
            this.clientSocket.on('log', (msg) => {
              debug(`browser log: ${msg}`)
            })
            this.clientSocket.on('listened', (msg) => {
              debug(`browser listened: ${msg}`)
              if (msg) {
                this._QueueBotSays(new BotiumMockMessage({ messageText: msg }))
              }
            })

            if (this.connectResolve) {
              this.connectResolve()
              this.connectResolve = null
            }
          })
          this.httpServer.listen(3000, () => {
            debug('waiting for browser connection')
            httpServerComplete()
          })
        }

      ], (err) => {
        if (err) {
          return reject(new Error(`Cannot build simplereset container: ${util.inspect(err)}`))
        }
        resolve(this)
      })
    })
  }

  Start () {
    this.eventEmitter.emit(Events.CONTAINER_STARTING, this)

    return new Promise((resolve, reject) => {
      async.series([
        (baseComplete) => {
          super.Start().then(() => baseComplete()).catch(baseComplete)
        },

        (opnComplete) => {
          if (this.clientSocket) {
            opnComplete()
          } else {
            this.connectResolve = opnComplete
            opn('http://127.0.0.1:3000', { app: 'Chrome' }).then((cp) => {
              debug(`browser process running`)
              this.clientProcess = cp
            })
          }
        }

      ], (err) => {
        if (err) {
          this.eventEmitter.emit(Events.CONTAINER_START_ERROR, this, err)
          return reject(new Error(`Start failed ${util.inspect(err)}`))
        }
        this.eventEmitter.emit(Events.CONTAINER_STARTED, this)
        resolve(this)
      })
    })
  }

  UserSays (mockMsg) {
    return new Promise((resolve, reject) => {
      if (this.clientSocket) {
        this.clientSocket.emit('speak', mockMsg)
        this.eventEmitter.emit(Events.MESSAGE_SENTTOBOT, this, mockMsg)
        resolve(this)
      } else {
        this.eventEmitter.emit(Events.MESSAGE_SENDTOBOT_ERROR, this, 'browser connection not online')
        reject(new Error('browser connection not online'))
      }
    })
  }

  WaitBotSays (channel = null, timeoutMillis = null) {
    if (this.clientSocket) {
      this.clientSocket.emit('listen')
      return super.WaitBotSays(channel, timeoutMillis)
    } else {
      return Promise.reject(new Error('browser connection not online'))
    }
  }

  Stop () {
    this.eventEmitter.emit(Events.CONTAINER_STOPPING, this)

    return new Promise((resolve, reject) => {
      async.series([
        (baseComplete) => {
          super.Stop().then(() => baseComplete()).catch(baseComplete)
        }

      ], (err) => {
        if (err) {
          this.eventEmitter.emit(Events.CONTAINER_STOP_ERROR, this, err)
          return reject(new Error(`Stop failed ${util.inspect(err)}`))
        }
        this.eventEmitter.emit(Events.CONTAINER_STOPPED, this)
        resolve(this)
      })
    })
  }

  Clean () {
    this.eventEmitter.emit(Events.CONTAINER_CLEANING, this)

    return new Promise((resolve, reject) => {
      async.series([
        (baseComplete) => {
          super.Clean().then(() => baseComplete()).catch(baseComplete)
        },

        (httpServerStopped) => {
          this.io = null
          if (this.clientSocket) {
            this.clientSocket.emit('close')
            this.clientSocket.disconnect(true)
          }
          this.clientSocket = null
          if (this.httpServer) {
            debug('closing http server')
            this.httpServer.close(() => {
              debug('stopped browser listening.')
              this.httpServer = null
              httpServerStopped()
            })
          } else {
            this.httpServer = null
            httpServerStopped()
          }
        },

        (clientProcessStopped) => {
          if (this.clientProcess) {
            debug('killing browser process')
            this.clientProcess.kill()
            this.clientProcess = null
          }
          clientProcessStopped()
        }

      ], (err) => {
        if (err) {
          this.eventEmitter.emit(Events.CONTAINER_CLEAN_ERROR, this, err)
          return reject(new Error(`Cleanup failed ${util.inspect(err)}`))
        }
        this.eventEmitter.emit(Events.CONTAINER_CLEANED, this)
        resolve(this)
      })
    })
  }
}
