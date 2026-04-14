import BaseTextAsserter from './BaseTextAsserter.js'
import MatchFunctions from '../../MatchFunctions.js'

export default class TextEqualsAnyICAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.equals(true), 'any', true)
    this.name = 'Text Equals Any (ignore case) Asserter'
  }
};
