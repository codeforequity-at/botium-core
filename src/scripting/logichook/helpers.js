const util = require('util')
const _ = require('lodash')

const extractParams = ({ argNames, isGlobal, globalArgs, args }) => {
  if (!isGlobal) {
    if (!args || args.length !== argNames.length) {
      throw new Error(`Expected 2 arguments ${util.inspect(args)}`)
    }
  }

  const result = {}
  for (const [i, argName] of argNames.entries()) {
    const argVal = isGlobal ? (globalArgs && globalArgs[argName]) : (args && args[i])
    if (_.isUndefined(argVal)) {
      if (isGlobal) {
        throw new Error(`${argName} is missing. globalArgs: ${util.inspect(this.globalArgs)}`)
      } else {
        throw new Error(`${argName} is missing. args: ${util.inspect(args)}`)
      }
    }
    result[argName] = argVal
  }
  return result
}

const _mediaFromCardsRecursive = (cards) => {
  if (!cards) {
    return []
  }
  let result = []
  for (const card of cards) {
    if (card.image) result.push(card.image)
    if (card.media) result = result.concat(card.media)
    if (card.cards) result = result.concat(_mediaFromCardsRecursive(card.cards))
  }
  return result
}
const mediaFromMsg = (msg, recursive) => {
  let allMedia = []
  if (msg.media) {
    allMedia = allMedia.concat(msg.media)
  }
  if (recursive && msg.cards) {
    allMedia = allMedia.concat(_mediaFromCardsRecursive(msg.cards))
  }
  return allMedia
}

const _buttonsFromCardsRecursive = (cards) => {
  if (!cards) {
    return []
  }
  let result = []
  for (const card of cards) {
    if (card.buttons) result = result.concat(card.buttons)
    if (card.cards) result = result.concat(_buttonsFromCardsRecursive(card.cards))
  }
  return result
}

const buttonsFromMsg = (msg, recursive) => {
  let allButtons = []
  if (msg.buttons) {
    allButtons = allButtons.concat(msg.buttons)
  }
  if (recursive && msg.cards) {
    allButtons = allButtons.concat(_buttonsFromCardsRecursive(msg.cards))
  }
  return allButtons
}

const _cardsFromCardsRecursive = (cards) => {
  if (!cards) {
    return []
  }
  let result = cards
  for (const card of cards) {
    if (card.cards) result = result.concat(_cardsFromCardsRecursive(card.cards))
  }
  return result
}

const cardsFromMsg = (msg, recursive) => {
  let allCards = []
  if (msg.cards) {
    if (recursive) {
      allCards = allCards.concat(_cardsFromCardsRecursive(msg.cards))
    } else {
      allCards = allCards.concat(msg.cards)
    }
  }
  return allCards
}

module.exports = {
  extractParams,
  mediaFromMsg,
  buttonsFromMsg,
  cardsFromMsg
}
