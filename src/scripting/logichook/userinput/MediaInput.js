const mime = require('mime-types')

module.exports = class MediaInput {
  setUserInput ({ convoStep, args, meMsg }) {
    if (!args || args.length === 0 || args.length > 1) {
      return Promise.reject(new Error(`${convoStep.stepTag}: MediaInput requires exactly 1 argument`))
    }
    if (!meMsg.media) {
      meMsg.media = []
    }
    meMsg.media.push({
      mediaUri: args[0],
      mimeType: mime.lookup(args[0])
    })
    return Promise.resolve()
  }
}
