module.exports = class BaseContainer {
  constructor (repo, caps) {
    this.repo = repo
    this.caps = Object.assign({}, caps)
  }

  Validate () {
    return Promise.resolve()
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
    return Promise.resolve()
  }
}
