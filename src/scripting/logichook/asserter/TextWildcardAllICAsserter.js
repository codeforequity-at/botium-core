const BaseTextAsserter = require('./BaseTextAsserter')
const MatchFunctions = require('../../MatchFunctions')

module.exports = class TextWildcardAllICAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.wildcard(true), 'all')
    this.name = 'Text Wildcard All (ignore case) Asserter'
  }
}
