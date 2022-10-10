const BaseTextAsserter = require('./BaseTextAsserter')
const MatchFunctions = require('../../MatchFunctions')

module.exports = class TextEqualsAnyAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.equals(false), 'any', true)
    this.name = 'Text Equals Any Asserter'
  }
}
