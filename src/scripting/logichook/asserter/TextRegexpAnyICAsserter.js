const BaseTextAsserter = require('./BaseTextAsserter')
const MatchFunctions = require('../../MatchFunctions')

module.exports = class TextRegexpAnyICAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.regexp(true), 'any')
    this.name = 'Text Regexp Any (ignore case) Asserter'
  }
}
