const util = require('util')
const async = require('async')
const rimraf = require('rimraf')
const _ = require('lodash')
const debug = require('debug')('botium-BaseContainer')

const Events = require('../Events')
const Capabilities = require('../Capabilities')
const Queue = require('../helpers/Queue')
const ProcessUtils = require('../helpers/ProcessUtils')
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
  }

  Validate () {
    return new Promise((resolve, reject) => {
      this._ValidateCustomHook(Capabilities.CUSTOMHOOK_ONBUILD)
      this._ValidateCustomHook(Capabilities.CUSTOMHOOK_ONSTART)
      this._ValidateCustomHook(Capabilities.CUSTOMHOOK_ONSTOP)
      this._ValidateCustomHook(Capabilities.CUSTOMHOOK_ONCLEAN)
      resolve(this)
    })
  }

  Build () {
    return new Promise((resolve, reject) => {
      this._RunCustomHook(Capabilities.CUSTOMHOOK_ONBUILD)
        .then(() => resolve(this))
        .catch((err) => reject(err))
    })
  }

  Start () {
    this.queues = {}
    return new Promise((resolve, reject) => {
      this._RunCustomHook(Capabilities.CUSTOMHOOK_ONSTART)
        .then(() => resolve(this))
        .catch((err) => reject(err))
    })
  }

  UserSaysText (text) {
    const mockMsg = new BotiumMockMessage({ sender: 'me', messageText: text })
    return this.UserSays(mockMsg)
  }

  UserSays (msgMock) {
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
      this._RunCustomHook(Capabilities.CUSTOMHOOK_ONSTOP)
        .then(() => resolve(this))
        .catch((err) => reject(err))
    })
  }

  Clean () {
    return new Promise((resolve, reject) => {
      async.series([
        (hookExecuted) => {
          this._RunCustomHook(Capabilities.CUSTOMHOOK_ONCLEAN)
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

    this.queues[botMsg.channel].push(botMsg)
    this.eventEmitter.emit(Events.MESSAGE_RECEIVEDFROMBOT, this, botMsg)
  }

  _ValidateCustomHook (capKey) {
    if (this.caps[capKey]) {
      if (!_.isFunction(this.caps[capKey]) && !_.isString(this.caps[capKey])) {
        throw new Error(`Custom Hook ${capKey} has to be a function or a command line string`)
      }
    }
  }

  _RunCustomHook (capKey) {
    if (this.caps[capKey]) {
      if (_.isFunction(this.caps[capKey])) {
        const hookFunction = this.caps[capKey]
        debug(`_RunCustomHook(${capKey}) exec function`)

        const hookResult = hookFunction(this)
        return Promise.resolve(hookResult)
          .then(() => debug(`_RunCustomHook ${capKey} finished`))
          .catch((err) => debug(`_RunCustomHook ${capKey} finished with error: ${err}`))
      } else if (_.isString(this.caps[capKey])) {
        const hookCommand = this.caps[capKey]

        debug(`_RunCustomHook(${capKey}) exec: ${hookCommand}`)
        ProcessUtils.childCommandLineRun(hookCommand, true, { cwd: this.repo.workingDirectory })
          .then(() => debug(`_RunCustomHook ${capKey} finished`))
          .catch((err) => debug(`_RunCustomHook ${capKey} finished with error: ${err}`))

        return Promise.resolve()
      } else {
        debug(`_RunCustomHook(${capKey}) invalid: ${this.caps[capKey]}`)
        return Promise.reject(new Error(`_RunCustomHook(${capKey}) invalid: ${this.caps[capKey]}`))
      }
    } else {
      return Promise.resolve()
    }
  }
}
