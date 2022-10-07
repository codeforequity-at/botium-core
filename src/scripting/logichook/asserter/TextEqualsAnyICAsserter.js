const BaseTextAsserter = require('./BaseTextAsserter')
const MatchFunctions = require('../../MatchFunctions')

module.exports = class TextEqualsAnyICAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.equals(true), 'any', true)
    this.name = 'Text Equals Any (ignore case) Asserter'
  }
}
