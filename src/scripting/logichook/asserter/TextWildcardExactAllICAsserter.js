const BaseTextAsserter = require('./BaseTextAsserter')
const MatchFunctions = require('../../MatchFunctions')

module.exports = class TextWildcardExactAllICAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.wildcardExact(true), 'all')
    this.name = 'Text Wildcard Exact All (ignore) Asserter'
  }
}
