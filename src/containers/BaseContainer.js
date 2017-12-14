const util = require('util')
const async = require('async')
const path = require('path')
const mkdirp = require('mkdirp')
const slug = require('slug')
const moment = require('moment')
const randomize = require('randomatic')
const rimraf = require('rimraf')
const debug = require('debug')('BaseContainer')

const Capabilities = require('../Capabilities')
const Queue = require('../helpers/Queue')

module.exports = class BaseContainer {
  constructor (repo, caps, envs) {
    this.repo = repo
    this.caps = Object.assign({}, caps)
    this.envs = Object.assign({}, envs)
    this.tempDirectory = path.resolve(process.cwd(), this.caps[Capabilities.TEMPDIR], slug(`${this.caps[Capabilities.PROJECTNAME]} ${moment().format('YYYYMMDD HHmmss')} ${randomize('Aa0', 5)}`))
    this.cleanupTasks = []
    this.queues = {}
  }

  Validate () {
    return new Promise((resolve, reject) => {
      this._AssertCapabilityExists(Capabilities.PROJECTNAME)
      this._AssertCapabilityExists(Capabilities.TEMPDIR)

      async.series([
        (tempdirCreated) => {
          mkdirp(this.tempDirectory, (err) => {
            if (err) {
              return tempdirCreated(new Error(`Unable to create temp directory ${this.tempDirectory}: ${err}`))
            }
            tempdirCreated()
          })
        }

      ], (err) => {
        if (err) {
          return reject(err)
        }
        resolve(this)
      })
    })
  }

  Build () {
    return Promise.resolve(this)
  }

  Start () {
    return Promise.resolve(this)
  }

  UserSaysText (msg) {
    return Promise.resolve(this)
  }

  UserSays (msg) {
    return Promise.resolve(this)
  }

  WaitBotSays (timeoutMillies = 5000) {
    if (!this.queues.default) {
      this.queues.default = new Queue()
    }

    return new Promise((resolve, reject) => {
      this.queues.default.pop(timeoutMillies)
        .then((m) => {
          resolve({ container: this, botMsg: m })
        })
        .catch((err) => {
          reject(err)
        })
    })
  }

  WaitBotSaysText (timeoutMillies = 5000) {
    return new Promise((resolve, reject) => {
      this.WaitBotSays(timeoutMillies)
        .then(({ container, botMsg }) => {
          resolve({ container, botMsg, text: botMsg.messageText })
        })
        .catch((err) => {
          reject(err)
        })
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

  _AssertCapabilityExists (cap, reject) {
    if (!this.caps[cap]) {
      throw new Error(`Capability property ${cap} not set`)
    }
  }

  _QueueBotSays (botMsg) {
    if (!this.queues.default) {
      this.queues.default = new Queue()
    }

    this.queues.default.push(botMsg)
  }
}
