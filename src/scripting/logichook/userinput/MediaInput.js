const mime = require('mime-types')
const { URL } = require('url')

const CONVO_DIR = 'spec/convo'

const getResolvedUri = (uri, convoFilename) => {
  return new URL(uri, `file://${process.cwd()}/${CONVO_DIR}/${convoFilename}`).toString()
}

module.exports = class MediaInput {
  setUserInput ({ convoStep, args, meMsg, convo }) {
    if (!args || args.length === 0 || args.length > 1) {
      return Promise.reject(new Error(`${convoStep.stepTag}: MediaInput requires exactly 1 argument`))
    }
    if (!meMsg.media) {
      meMsg.media = []
    }
    meMsg.media.push({
      mediaUri: getResolvedUri(args[0], convo.sourceTag.filename),
      mimeType: mime.lookup(args[0])
    })
    return Promise.resolve()
  }
}
