import _ from 'lodash'

class BotiumMockAsserter {
  constructor (fromJson = {}) {
    this.name = fromJson.name
    this.args = _.cloneDeep(fromJson.args)
    this.not = fromJson.not
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

export {
  BotiumMockAsserter,
  BotiumMockUserInput,
  BotiumMockLogicHook
}

export default {
  BotiumMockAsserter,
  BotiumMockUserInput,
  BotiumMockLogicHook
}
