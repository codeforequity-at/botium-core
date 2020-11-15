const { BotiumMockButton } = require('../../../mocks/BotiumMockRichMessageTypes')

module.exports = class ButtonInput {
  setUserInput ({ convoStep, args, meMsg }) {
    if (!args || args.length === 0 || args.length > 2) {
      return Promise.reject(new Error(`${convoStep.stepTag}: ButtonInput requires 1 or 2 arguments`))
    }
    meMsg.buttons = [new BotiumMockButton({ payload: args[0], text: args.length === 2 ? args[1] : null })]
    meMsg.messageText = args[0]
    return Promise.resolve()
  }
}
