const _ = require('lodash')

class BotiumMockAsserter {
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.args = _.cloneDeep(fromJson.args)
  }
}
class BotiumMockUserInput {
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.args = _.cloneDeep(fromJson.args)
  }
}
class BotiumMockLogicHook {
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.args = _.cloneDeep(fromJson.args)
  }
}

module.exports = {
  BotiumMockAsserter,
  BotiumMockUserInput,
  BotiumMockLogicHook
}
