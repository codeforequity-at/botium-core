const { buttonsFromMsg } = require('../helpers')
const BaseCountAsserter = require('./BaseCountAsserter')

const _buttonsCount = ({ botMsg }) => {
  return buttonsFromMsg(botMsg, true).length || 0
}

module.exports = class ButtonsCountRecAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, 'Buttons')
    this.name = 'ButtonsCountRecAsserter'
  }

  async _getCount (argv) { return _buttonsCount(argv) }
}
