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

module.exports = class BaseContainer {
  constructor (repo, caps) {
    this.repo = repo
    this.caps = Object.assign({}, caps)
    this.tempDirectory = path.resolve(process.cwd(), this.caps[Capabilities.TEMPDIR], slug(`${this.caps[Capabilities.PROJECTNAME]} ${moment().format('YYYYMMDD HHmmss')} ${randomize('Aa0', 5)}`))
    this.cleanupTasks = []
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
        resolve()
      })
    })
  }

  Build () {
    return Promise.resolve()
  }

  Start () {
    return Promise.resolve()
  }

  Stop () {
    return Promise.resolve()
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
}
