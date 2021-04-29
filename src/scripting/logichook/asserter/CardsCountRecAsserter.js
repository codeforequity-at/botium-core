const { cardsFromMsg } = require('../helpers')
const BaseCountAsserter = require('./BaseCountAsserter')

const _cardsCount = ({ botMsg }) => {
  return cardsFromMsg(botMsg, true).length
}

module.exports = class CardsCountRecAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, _cardsCount, 'Cards')
    this.name = 'CardsCountRecAsserter'
  }
}
