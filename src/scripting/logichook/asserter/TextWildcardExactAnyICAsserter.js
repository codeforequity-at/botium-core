import BaseTextAsserter from './BaseTextAsserter.js'
import MatchFunctions from '../../MatchFunctions.js'

export default class TextWildcardExactAnyICAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.wildcardExact(true), 'any')
    this.name = 'Text Wildcard Exact Any (ignore case) Asserter'
  }
};
