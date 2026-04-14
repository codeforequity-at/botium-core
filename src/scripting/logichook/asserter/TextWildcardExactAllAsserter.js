import BaseTextAsserter from './BaseTextAsserter.js'
import MatchFunctions from '../../MatchFunctions.js'

export default class TextWildcardExactAllAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.wildcardExact(false), 'all')
    this.name = 'Text Wildcard Exact All Asserter'
  }
};
