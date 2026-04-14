import { cardsFromMsg } from '../helpers.js'
import BaseCountAsserter from './BaseCountAsserter.js'

const _cardsCount = ({ botMsg }) => {
  return cardsFromMsg(botMsg, true).length
}

export default class CardsCountRecAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, 'Cards')
    this.name = 'Cards Count (recursive) Asserter'
  }

  async _getCount (argv) { return _cardsCount(argv) }
};
