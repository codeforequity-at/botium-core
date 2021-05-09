const { mediaFromMsg } = require('../helpers')
const BaseCountAsserter = require('./BaseCountAsserter')

const _mediaCount = ({ botMsg }) => {
  return mediaFromMsg(botMsg, false).length
}

module.exports = class MediaCountAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, 'Media')
    this.name = 'MediaCountAsserter'
  }

  async _getCount (argv) { return _mediaCount(argv) }
}
