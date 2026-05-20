const _ = require('lodash')

class BotiumMockAsserter {
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.args = _.cloneDeep(fromJson.args)
    this.not = fromJson.not
    this.resolvedArgs = fromJson.resolvedArgs || null
  }
}
class BotiumMockUserInput {
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.args = _.cloneDeep(fromJson.args)
    this.resolvedArgs = fromJson.resolvedArgs || null
  }
}
class BotiumMockLogicHook {
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.args = _.cloneDeep(fromJson.args)
    this.resolvedArgs = fromJson.resolvedArgs || null
  }
}

module.exports = {
  BotiumMockAsserter,
  BotiumMockUserInput,
  BotiumMockLogicHook
}
