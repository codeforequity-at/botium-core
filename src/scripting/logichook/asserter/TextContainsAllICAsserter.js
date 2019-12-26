const TextContainsAllAsserter = require('./TextContainsAllAsserter')

module.exports = class TextContainsAllICAsserter extends TextContainsAllAsserter {
  constructor (context, caps = {}) {
    super(context, caps, true)
  }
}
