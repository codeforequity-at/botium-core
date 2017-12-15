const fs = require('fs')
const path = require('path')
const Source = require('../Source')
const BaseRepo = require('./BaseRepo')

module.exports = class LocalRepo extends BaseRepo {
  Validate () {
    return super.Validate().then(() => {
      this._AssertSourceExists(Source.LOCALPATH)

      const checkPath = this.sources[Source.LOCALPATH]
      fs.stat(checkPath, (err, stats) => {
        if (err) {
          throw new Error(`${checkPath} not available: ${err}`)
        }
        if (stats.isDirectory() && !stats.isSymbolicLink()) {
          fs.access(checkPath, fs.constants.W_OK, (err1) => {
            if (err) {
              throw new Error(`${checkPath} not writeable: ${err}`)
            }
          })
        } else {
          throw new Error(`${checkPath} not a regular directory`)
        }
      })
    })
  }

  Prepare () {
    // No need to prepare anything
    this.workingDirectory = path.resolve(this.sources[Source.LOCALPATH])
    return Promise.resolve()
  }
}
