const { mediaFromMsg } = require('../helpers')
const BaseCountAsserter = require('./BaseCountAsserter')

const _mediaCount = ({ botMsg }) => {
  return mediaFromMsg(botMsg, true).length || 0
}

module.exports = class MediaCountRecAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, _mediaCount, 'Media')
    this.name = 'MediaCountRecAsserter'
  }
}
