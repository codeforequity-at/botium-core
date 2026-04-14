import { buttonsFromMsg } from '../helpers.js'
import BaseCountAsserter from './BaseCountAsserter.js'

const _buttonsCount = ({ botMsg }) => {
  return buttonsFromMsg(botMsg, true).length || 0
}

export default class ButtonsCountRecAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, 'Buttons')
    this.name = 'Buttons Count (recursive) Asserter'
  }

  async _getCount (argv) { return _buttonsCount(argv) }
};
