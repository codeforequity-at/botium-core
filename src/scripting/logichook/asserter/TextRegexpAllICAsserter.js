import BaseTextAsserter from './BaseTextAsserter.js'
import MatchFunctions from '../../MatchFunctions.js'

export default class TextRegexpAllICAsserter extends BaseTextAsserter {
  constructor (context, caps = {}) {
    super(context, caps, MatchFunctions.regexp(true), 'all')
    this.name = 'Text Regexp All (ignore all) Asserter'
  }
};
