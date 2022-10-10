const BaseTextAsserter = require('./BaseTextAsserter')
const MatchFunctions = require('../../MatchFunctions')

module.exports = class TextRegexpAllICAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.regexp(true), 'all')
    this.name = 'Text Regexp All (ignore all) Asserter'
  }
}
