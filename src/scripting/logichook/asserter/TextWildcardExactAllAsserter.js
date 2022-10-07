const BaseTextAsserter = require('./BaseTextAsserter')
const MatchFunctions = require('../../MatchFunctions')

module.exports = class TextWildcardExactAllAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.wildcardExact(false), 'all')
    this.name = 'Text Wildcard Exact All Asserter'
  }
}
