const mime = require('mime-types')
const { URL } = require('url')

module.exports = class MediaInput {
  constructor (context, caps = {}, globalArgs = {}) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
  }

  _getResolvedUri (uri, convoDir, convoFilename) {
    if (this.globalArgs && this.globalArgs.baseUri) {
      return new URL(uri, this.globalArgs.baseUri).toString()
    } else if (convoDir && convoFilename) {
      return new URL(uri, `file://${convoDir}/${convoFilename}`).toString()
    } else {
      return uri
    }
  }

  setUserInput ({ convoStep, args, meMsg, convo }) {
    if (!args || args.length === 0 || args.length > 1) {
      return Promise.reject(new Error(`${convoStep.stepTag}: MediaInput requires exactly 1 argument`))
    }
    if (!meMsg.media) {
      meMsg.media = []
    }
    meMsg.media.push({
      mediaUri: this._getResolvedUri(args[0], convo.sourceTag.convoDir, convo.sourceTag.filename),
      mimeType: mime.lookup(args[0])
    })
    return Promise.resolve()
  }
}
