const { cardsFromMsg } = require('../helpers')
const BaseCountAsserter = require('./BaseCountAsserter')

const _cardsCount = ({ botMsg }) => {
  return cardsFromMsg(botMsg, false).length
}

module.exports = class CardsCountAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, _cardsCount, 'Cards')
    this.name = 'CardsCountAsserter'
  }
}
