const util = require('util')
const async = require('async')
const rimraf = require('rimraf')
const Bottleneck = require('bottleneck')
const debug = require('debug')('botium-BaseContainer')

const Events = require('../Events')
const Capabilities = require('../Capabilities')
const Queue = require('../helpers/Queue')
const { executeHook, getHook } = require('../helpers/HookUtils')
const BotiumMockMessage = require('../mocks/BotiumMockMessage')

module.exports = class BaseContainer {
  constructor (eventEmitter, tempDirectory, repo, caps, envs) {
    this.eventEmitter = eventEmitter
    this.repo = repo
    this.caps = Object.assign({}, caps)
    this.envs = Object.assign({}, envs)
    this.tempDirectory = tempDirectory
    this.cleanupTasks = []
    this.queues = {}
    this.userSaysLimiter = null
  }

  Validate () {
    this.onBuildHook = getHook(this.caps[Capabilities.CUSTOMHOOK_ONBUILD])
    this.onStartHook = getHook(this.caps[Capabilities.CUSTOMHOOK_ONSTART])
    this.onUserSaysHook = getHook(this.caps[Capabilities.CUSTOMHOOK_ONUSERSAYS])
    this.onBotResponseHook = getHook(this.caps[Capabilities.CUSTOMHOOK_ONBOTRESPONSE])
    this.onStopHook = getHook(this.caps[Capabilities.CUSTOMHOOK_ONSTOP])
    this.onCleanHook = getHook(this.caps[Capabilities.CUSTOMHOOK_ONCLEAN])
    return Promise.resolve()
  }

  Build () {
    if (this.caps[Capabilities.RATELIMIT_USERSAYS_MAXCONCURRENT] || this.caps[Capabilities.RATELIMIT_USERSAYS_MINTIME]) {
      const opts = {}
      if (this.caps[Capabilities.RATELIMIT_USERSAYS_MAXCONCURRENT]) opts.maxConcurrent = this.caps[Capabilities.RATELIMIT_USERSAYS_MAXCONCURRENT]
      if (this.caps[Capabilities.RATELIMIT_USERSAYS_MINTIME]) opts.minTime = this.caps[Capabilities.RATELIMIT_USERSAYS_MINTIME]
      this.userSaysLimiter = new Bottleneck(opts)
      debug(`Build: Applying userSays rate limits ${util.inspect(opts)}`)
    }

    return new Promise((resolve, reject) => {
      this._RunCustomHook('onBuild', this.onBuildHook)
        .then(() => resolve(this))
        .catch((err) => reject(err))
    })
  }

  Start () {
    this.queues = {}
    return new Promise((resolve, reject) => {
      this._RunCustomHook('onStart', this.onStartHook)
        .then(() => resolve(this))
        .catch((err) => reject(err))
    })
  }

  UserSaysText (text) {
    const meMsg = new BotiumMockMessage({ sender: 'me', messageText: text })
    return this.UserSays(meMsg)
  }

  UserSays (meMsg) {
    const run = () => this._RunCustomHook('onUserSays', this.onUserSaysHook, { meMsg })
      .then(() => this.UserSaysImpl(meMsg))

    if (this.userSaysLimiter) {
      return this.userSaysLimiter.schedule(run)
    } else {
      return run()
    }
  }

  UserSaysImpl (meMsg) {
    return Promise.resolve(this)
  }

  WaitBotSays (channel = null, timeoutMillis = null) {
    if (!channel) channel = 'default'
    if (!timeoutMillis) timeoutMillis = this.caps[Capabilities.WAITFORBOTTIMEOUT]

    if (!this.queues[channel]) {
      this.queues[channel] = new Queue()
    }

    return new Promise((resolve, reject) => {
      this.queues[channel].pop(timeoutMillis)
        .then((botMsg) => {
          resolve(botMsg)
        })
        .catch((err) => {
          debug(`WaitBotSays error ${util.inspect(err)}`)
          resolve()
        })
    })
  }

  WaitBotSaysText (channel = null, timeoutMillis = null) {
    return new Promise((resolve, reject) => {
      this.WaitBotSays(channel, timeoutMillis)
        .then((botMsg) => {
          if (botMsg) {
            resolve(botMsg.messageText)
          } else {
            resolve()
          }
        })
        .catch((err) => {
          debug(`WaitBotSaysText error ${util.inspect(err)}`)
          resolve()
        })
    })
  }

  Restart () {
    return new Promise((resolve, reject) => {
      this.Stop()
        .then(() => this.Start())
        .then(() => resolve())
        .catch((err) => reject(err))
    })
  }

  Stop () {
    return new Promise((resolve, reject) => {
      this._RunCustomHook('onStop', this.onStopHook)
        .then(() => resolve(this))
        .catch((err) => reject(err))
    })
  }

  Clean () {
    this.userSaysLimiter = null
    return new Promise((resolve, reject) => {
      async.series([
        (hookExecuted) => {
          this._RunCustomHook('onClean', this.onCleanHook)
            .then(() => hookExecuted())
            .catch(() => hookExecuted())
        },

        (cleanupTasksDone) => {
          if (this.cleanupTasks) {
            async.series(
              this.cleanupTasks.map((task) => {
                return (cb) => {
                  task((err) => {
                    if (err) debug(`Cleanup failed: ${util.inspect(err)}`)
                    cb()
                  })
                }
              }),
              () => {
                cleanupTasksDone()
              }
            )
          } else {
            cleanupTasksDone()
          }
        },

        (rimraffed) => {
          if (this.caps[Capabilities.CLEANUPTEMPDIR]) {
            debug(`Cleanup rimrafing temp dir ${this.tempDirectory}`)
            rimraf(this.tempDirectory, (err) => {
              if (err) debug(`Cleanup temp dir ${this.tempDirectory} failed: ${util.inspect(err)}`)
              rimraffed()
            })
          } else {
            rimraffed()
          }
        }
      ], (err) => {
        if (err) {
          return reject(new Error(`Cleanup failed ${util.inspect(err)}`))
        }
        resolve()
      })
    })
  }

  _AssertCapabilityExists (cap) {
    if (!Object.prototype.hasOwnProperty.call(this.caps, cap)) {
      throw new Error(`Capability property ${cap} not set`)
    }
  }

  _AssertOneCapabilityExists () {
    const checkCaps = [...arguments]
    const found = checkCaps.find((cap) => this.caps[cap])
    if (!found) {
      throw new Error(`Capability property of ${checkCaps.join()} not set`)
    }
  }

  _QueueBotSays (botMsg) {
    if (!botMsg.channel) botMsg.channel = 'default'
    if (!botMsg.sender) botMsg.sender = 'bot'

    if (!this.queues[botMsg.channel]) {
      this.queues[botMsg.channel] = new Queue()
    }
    return this._RunCustomHook('onBotResponse', this.onBotResponseHook, { botMsg })
      .then(() => {
        this.queues[botMsg.channel].push(botMsg)
        this.eventEmitter.emit(Events.MESSAGE_RECEIVEDFROMBOT, this, botMsg)
      })
  }

  async _RunCustomHook (name, hook, args) {
    try {
      await executeHook(hook, Object.assign({}, { container: this }, args))
      debug(`_RunCustomHook ${name} finished`)
    } catch (err) {
      debug(`_RunCustomHook ${name} finished with error: ${err.message || util.inspect(err)}`)
    }
  }
}
