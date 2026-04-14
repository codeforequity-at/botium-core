import BaseTextAsserter from './BaseTextAsserter.js'
import MatchFunctions from '../../MatchFunctions.js'

export default class TextContainsAllAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.include(false), 'all')
    this.name = 'Text Contains All Asserter'
  }
};
