import BaseTextAsserter from './BaseTextAsserter.js'
import MatchFunctions from '../../MatchFunctions.js'

export default class TextWildcardAnyICAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.wildcard(true), 'any')
    this.name = 'Text Wildcard Any (ignore case) Asserter'
  }
};
