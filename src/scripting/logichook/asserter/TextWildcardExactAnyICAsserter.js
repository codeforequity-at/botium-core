const BaseTextAsserter = require('./BaseTextAsserter')
const MatchFunctions = require('../../MatchFunctions')

module.exports = class TextWildcardExactAnyICAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.wildcardExact(true), 'any')
    this.name = 'Text Wildcard Exact Any (ignore case) Asserter'
  }
}
