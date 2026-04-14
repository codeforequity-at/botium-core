import { buttonsFromMsg } from '../helpers.js'
import BaseCountAsserter from './BaseCountAsserter.js'

const _buttonsCount = ({ botMsg }) => {
  return buttonsFromMsg(botMsg, false).length
}

export default class ButtonsCountAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, 'Buttons')
    this.name = 'Buttons Count Asserter'
  }

  async _getCount (argv) { return _buttonsCount(argv) }
};
