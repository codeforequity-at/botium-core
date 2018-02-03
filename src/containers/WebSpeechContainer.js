const util = require('util')
const opn = require('opn')
const path = require('path')
const async = require('async')
const findRoot = require('find-root')
const HttpServer = require('tiny-server')
const socket = require('socket.io')
const debug = require('debug')('botium-WebSpeechContainer')

const Capabilities = require('../Capabilities')
const Events = require('../Events')
const BaseContainer = require('./BaseContainer')
const BotiumMockMessage = require('../mocks/BotiumMockMessage')

const botiumPackageRootDir = findRoot()

module.exports = class WebSpeechContainer extends BaseContainer {
  Validate () {
    return super.Validate().then(() => {
      this._AssertCapabilityExists(Capabilities.WEBSPEECH_SERVER_PORT)
      this._AssertCapabilityExists(Capabilities.WEBSPEECH_LANGUAGE)
    })
  }

  Build () {
    this.browserConfig = {
      WEBSPEECH_LANGUAGE: this.caps[Capabilities.WEBSPEECH_LANGUAGE],
      WEBSPEECH_PITCH: this.caps[Capabilities.WEBSPEECH_PITCH],
      WEBSPEECH_RATE: this.caps[Capabilities.WEBSPEECH_RATE],
      WEBSPEECH_VOLUME: this.caps[Capabilities.WEBSPEECH_VOLUME],
      WEBSPEECH_VOICE: this.caps[Capabilities.WEBSPEECH_VOICE]
    }

    return new Promise((resolve, reject) => {
      async.series([
        (baseComplete) => {
          super.Build().then(() => baseComplete()).catch(baseComplete)
        },

        (httpServerComplete) => {
          this.httpServer = new HttpServer(path.resolve(botiumPackageRootDir, 'src', 'containers', 'webspeech'))
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
            this.clientSocket.on('botsays', (msg) => {
              debug(`browser botsays: ${msg}`)
              if (msg) {
                this._QueueBotSays(new BotiumMockMessage({ messageText: msg }))
              }
            })
            this.clientSocket.on('usersaid', (msg) => {
              if (this.usersaidResolve) {
                this.usersaidResolve()
                this.usersaidResolve = null
              }
            })

            if (this.connectResolve) {
              this.connectResolve()
              this.connectResolve = null
            }
          })
          this.httpServer.listen(this.caps[Capabilities.WEBSPEECH_SERVER_PORT], () => {
            debug(`waiting for browser connection on port ${this.caps[Capabilities.WEBSPEECH_SERVER_PORT]}`)
            httpServerComplete()
          }).once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
              debug(`port ${this.caps[Capabilities.WEBSPEECH_SERVER_PORT]} already in use.`)
              httpServerComplete(err)
            }
          })
        }

      ], (err) => {
        if (err) {
          return reject(new Error(`Cannot build webspeech container: ${util.inspect(err)}`))
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

            let opnOptions = { }
            if (this.caps[Capabilities.WEBSPEECH_BROWSER_APP]) {
              opnOptions.app = this.caps[Capabilities.WEBSPEECH_BROWSER_APP]
            }

            const browserUrl = `http://127.0.0.1:${this.caps[Capabilities.WEBSPEECH_SERVER_PORT]}/WebSpeechContainer.html`
            debug(`opening browser process to point to url ${browserUrl}`)
            opn(browserUrl, opnOptions).then((cp) => {
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
        this.usersaidResolve = () => {
          this.eventEmitter.emit(Events.MESSAGE_SENTTOBOT, this, mockMsg)
          resolve(this)
        }
        this.clientSocket.emit('usersays', this.browserConfig, mockMsg)
      } else {
        this.eventEmitter.emit(Events.MESSAGE_SENDTOBOT_ERROR, this, 'browser connection not online')
        reject(new Error('browser connection not online'))
      }
    })
  }

  WaitBotSays (channel = null, timeoutMillis = null) {
    if (this.clientSocket) {
      this.clientSocket.emit('waitbotsays', this.browserConfig)
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
            if (this.caps[Capabilities.WEBSPEECH_CLOSEBROWSER]) {
              this.clientSocket.emit('close')
            }
            this.clientSocket.disconnect(true)
            this.clientSocket = null
          }
          if (this.httpServer) {
            debug('closing http server')
            this.httpServer.close(() => {
              debug('stopped browser listening.')
              this.httpServer = null
              httpServerStopped()
            })
          } else {
            httpServerStopped()
          }
        },

        (clientProcessStopped) => {
          if (this.caps[Capabilities.WEBSPEECH_CLOSEBROWSER]) {
            if (this.clientProcess) {
              debug('killing browser process')
              this.clientProcess.kill()
            }
          }
          this.clientProcess = null
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
