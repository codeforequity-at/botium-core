const TextContainsAnyAsserter = require('./TextContainsAnyAsserter')

module.exports = class TextContainsAnyICAsserter extends TextContainsAnyAsserter {
  constructor (context, caps = {}) {
    super(context, caps, true)
  }
}
