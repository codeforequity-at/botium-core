const { mediaFromMsg } = require('../helpers')
const BaseCountAsserter = require('./BaseCountAsserter')

const _mediaCount = ({ botMsg }) => {
  return mediaFromMsg(botMsg, false).length
}

module.exports = class MediaCountAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, _mediaCount, 'Media')
    this.name = 'MediaCountAsserter'
  }
}
