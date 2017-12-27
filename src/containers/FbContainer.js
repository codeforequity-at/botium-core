const util = require('util')
const async = require('async')
const fblogin = require('facebook-chat-api')
const debug = require('debug')('botium-FbContainer')

const Events = require('../Events')
const Capabilities = require('../Capabilities')
const BaseContainer = require('./BaseContainer')
const BotiumMockMessage = require('../mocks/BotiumMockMessage')

module.exports = class FbContainer extends BaseContainer {
  Validate () {
    return super.Validate().then(() => {
      this._AssertCapabilityExists(Capabilities.FB_PAGEID)
      this._AssertCapabilityExists(Capabilities.FB_USER)
      this._AssertCapabilityExists(Capabilities.FB_PASSWORD)
    })
  }

  Build () {
    return new Promise((resolve, reject) => {
      async.series([
        (baseComplete) => {
          super.Build().then(() => baseComplete()).catch(baseComplete)
        },

        (fbLoginReady) => {
          this.fbapi = null
          debug(`logging into facebook page ${this.caps[Capabilities.FB_PAGEID]} with user ${this.caps[Capabilities.FB_USER]}`)
          fblogin({ email: this.caps[Capabilities.FB_USER], password: this.caps[Capabilities.FB_PASSWORD] }, { logLevel: 'warn' }, (err, api) => {
            if (err) {
              fbLoginReady(`Facebook login failed: ${util.inspect(err)}`)
            } else {
              debug('logging into facebook ready')
              this.fbapi = api
              fbLoginReady()
            }
          })
        }
      ], (err) => {
        if (err) {
          return reject(new Error(`Cannot build facebook container: ${util.inspect(err)}`))
        }
        resolve(this)
      })
    })
  }

  Start () {
    if (!this.fbapi) return Promise.reject(new Error('not built'))

    this.eventEmitter.emit(Events.CONTAINER_STARTING, this)

    return new Promise((resolve, reject) => {
      async.series([
        (baseComplete) => {
          super.Start().then(() => baseComplete()).catch(baseComplete)
        },

        (startListenerDone) => {
          if (this.fbapiStopListener) {
            this.fbapiStopListener()
            this.fbapiStopListener = null
          }
          this.fbapiStopListener = this.fbapi.listen((err, event) => {
            if (err) {
              debug(`fbapi Error: ${util.inspect(err)}`)
            } else if (event.type === 'message') {
              debug(`fbapi received message: ${util.inspect(event)}`)
              if (event.body) {
                const botMsg = { sourceData: event, messageText: event.body }
                this._QueueBotSays(new BotiumMockMessage(botMsg))
                this.eventEmitter.emit(Events.MESSAGE_RECEIVEDFROMBOT, this, botMsg)
              }
            } else {
              debug(`fbapi received ignored event: ${util.inspect(event)}`)
            }
          })
          startListenerDone()
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
    if (!this.fbapi) return Promise.reject(new Error('not built'))

    this.fbapi.sendMessage(mockMsg.messageText, this.caps[Capabilities.FB_PAGEID])
    this.eventEmitter.emit(Events.MESSAGE_SENTTOBOT, this, mockMsg)
    return Promise.resolve(this)
  }

  Stop () {
    if (!this.fbapi) return Promise.reject(new Error('not built'))

    this.eventEmitter.emit(Events.CONTAINER_STOPPING, this)

    return new Promise((resolve, reject) => {
      async.series([
        (baseComplete) => {
          super.Stop().then(() => baseComplete()).catch(baseComplete)
        },

        (stopListenerDone) => {
          if (this.fbapiStopListener) {
            this.fbapiStopListener()
            this.fbapiStopListener = null
          }
          stopListenerDone()
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
    if (!this.fbapi) return Promise.reject(new Error('not built'))

    this.eventEmitter.emit(Events.CONTAINER_CLEANING, this)

    return new Promise((resolve, reject) => {
      async.series([

        (fbLogoutReady) => {
          if (this.fbapi) {
            this.fbapi.logout((err) => {
              debug(`logging out of facebook ready (${util.inspect(err)})`)
              this.fbapi = null
              fbLogoutReady()
            })
          } else {
            fbLogoutReady()
          }
        },

        (baseComplete) => {
          super.Clean().then(() => baseComplete()).catch(baseComplete)
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
