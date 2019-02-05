module.exports = class ButtonInput {
  setUserInput ({ convoStep, args, meMsg }) {
    if (!args || args.length === 0 || args.length > 1) {
      return Promise.reject(new Error(`${convoStep.stepTag}: ButtonInput requires exactly 1 argument`))
    }
    meMsg.buttons = [{ text: args[0], payload: args[0] }]
    meMsg.messageText = args[0]
    return Promise.resolve()
  }
}
