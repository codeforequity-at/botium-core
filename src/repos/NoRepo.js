const BaseRepo = require('./BaseRepo')

module.exports = class NoRepo extends BaseRepo {
  Validate () {
    return super.Validate()
  }

  Prepare () {
    return super.Prepare()
  }
}
