import { cardsFromMsg } from '../helpers.js'
import BaseCountAsserter from './BaseCountAsserter.js'

const _cardsCount = ({ botMsg }) => {
  return cardsFromMsg(botMsg, false).length
}

export default class CardsCountAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, 'Cards')
    this.name = 'Cards Count Asserter'
  }

  async _getCount (argv) { return _cardsCount(argv) }
};
