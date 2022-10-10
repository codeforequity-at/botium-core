const BaseTextAsserter = require('./BaseTextAsserter')
const MatchFunctions = require('../../MatchFunctions')

module.exports = class TextWildcardAnyICAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.wildcard(true), 'any')
    this.name = 'Text Wildcard Any (ignore case) Asserter'
  }
}
