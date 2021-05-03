const { buttonsFromMsg } = require('../helpers')
const BaseCountAsserter = require('./BaseCountAsserter')

const _buttonsCount = ({ botMsg }) => {
  return buttonsFromMsg(botMsg, false).length
}

module.exports = class ButtonsCountAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, 'Buttons')
    this.name = 'ButtonsCountAsserter'
  }

  async _getCount (argv) { return _buttonsCount(argv) }
}
