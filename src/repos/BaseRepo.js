module.exports = class BaseRepo {
  constructor (sources) {
    this.sources = Object.assign({}, sources)
    this.workingDirectory = null
  }

  Validate () {
    return Promise.resolve()
  }

  Prepare () {
    return Promise.resolve()
  }
}
