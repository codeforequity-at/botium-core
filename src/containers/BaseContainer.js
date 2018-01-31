const util = require('util')
const async = require('async')
const rimraf = require('rimraf')
const debug = require('debug')('botium-BaseContainer')

const Capabilities = require('../Capabilities')
const Queue = require('../helpers/Queue')
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
    return Promise.resolve()
  }

  Build () {
    return Promise.resolve(this)
  }

  Start () {
    this.queues = {}
    return Promise.resolve(this)
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
    return Promise.resolve(this)
  }

  Clean () {
    return new Promise((resolve, reject) => {
      async.series([

        (rimraffed) => {
          if (this.caps[Capabilities.CLEANUPTEMPDIR]) {
            rimraf(this.tempDirectory, (err) => {
              if (err) debug(`Cleanup temp dir ${this.tempDirectory} failed: ${util.inspect(err)}`)
              rimraffed()
            })
          } else {
            rimraffed()
          }
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
    if (!this.caps[cap]) {
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
  }
}
