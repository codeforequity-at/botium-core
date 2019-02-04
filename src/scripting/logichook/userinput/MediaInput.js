module.exports = class MediaInput {
  setUserInput ({ convoStep, args, meMsg }) {
    if (!args || args.length === 0 || args.length > 1) {
      return Promise.reject(new Error(`${convoStep.stepTag}: MediaInput requires exactly 1 argument`))
    }
    meMsg.media = [{ mediaUri: args[0] }]
    return Promise.resolve()
  }
}
