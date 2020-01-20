const BaseTextAsserter = require('./BaseTextAsserter')
const MatchFunctions = require('../../MatchFunctions')

module.exports = class TextContainsAnyAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.include(true), 'all')
  }
}
