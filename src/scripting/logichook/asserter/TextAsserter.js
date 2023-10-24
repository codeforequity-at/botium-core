const BaseTextAsserter = require('./BaseTextAsserter')

/**
 * This asserter could replace every other text asserter
 * @type {TextAsserter}
 */
module.exports = class TextAsserter extends BaseTextAsserter {
  constructor (context, caps, matchingMode) {
    super(context, caps, matchingMode, null, null)
    this.name = 'Default match mode Asserter'
  }
}
