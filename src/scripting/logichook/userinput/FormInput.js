const { BotiumMockForm } = require('../../../mocks/BotiumMockRichMessageTypes')

module.exports = class FormInput {
  setUserInput ({ convoStep, args, meMsg }) {
    if (!args || args.length === 0) {
      return Promise.reject(new Error(`${convoStep.stepTag}: FormInput requires at least 1 argument`))
    }

    if (!meMsg.forms) meMsg.forms = []
    meMsg.forms.push(new BotiumMockForm({
      name: args[0],
      value: args.length > 1 ? (args.length > 2 ? args.slice(1) : args[1]) : true
    }))
    return Promise.resolve()
  }
}
