const BaseRepo = require('./BaseRepo')

module.exports = class GitRepo extends BaseRepo {
  Validate () {
    return Promise.resolve()
  }

  Prepare () {
    return Promise.resolve()
  }
}
