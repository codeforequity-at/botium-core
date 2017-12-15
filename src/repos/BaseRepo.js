module.exports = class BaseRepo {
  constructor (tempDirectory, sources) {
    this.tempDirectory = tempDirectory
    this.sources = Object.assign({}, sources)
    this.workingDirectory = null
  }

  Validate () {
    return Promise.resolve()
  }

  Prepare () {
    return Promise.resolve()
  }

  _AssertSourceExists (source) {
    if (!this.sources[source]) {
      throw new Error(`Source property ${source} not set`)
    }
  }
}
