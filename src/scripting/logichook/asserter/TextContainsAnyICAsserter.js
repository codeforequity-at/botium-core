const BaseTextAsserter = require('./BaseTextAsserter')
const MatchFunctions = require('../../MatchFunctions')

module.exports = class TextContainsAnyICAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.include(true), 'any')
    this.name = 'Text Contains Any (ignore case) Asserter'
  }
}
