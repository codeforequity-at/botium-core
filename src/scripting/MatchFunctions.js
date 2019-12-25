const _ = require('lodash')

const { toString, quoteRegexpString } = require('./helper')

module.exports.regexp = (ignoreCase) => (botresponse, utterance) => {
  if (_.isUndefined(botresponse)) return false
  utterance = toString(utterance)

  const regexp = ignoreCase ? (new RegExp(utterance, 'i')) : (new RegExp(utterance, ''))
  return regexp.test(toString(botresponse))
}

module.exports.wildcard = (ignoreCase) => (botresponse, utterance) => {
  if (_.isUndefined(botresponse)) {
    if (utterance.trim() === '*') return true
    else return false
  }
  utterance = toString(utterance)
  const utteranceRe = quoteRegexpString(utterance).replace(/\\\*/g, '(.*)')

  const botresponseStr = toString(botresponse)
  const regexp = ignoreCase ? (new RegExp(utteranceRe, 'i')) : (new RegExp(utteranceRe, ''))
  return regexp.test(botresponseStr)
}

module.exports.include = (ignoreCase) => (botresponse, utterance) => {
  if (_.isUndefined(botresponse)) return false
  utterance = toString(utterance)
  botresponse = toString(botresponse)

  if (ignoreCase) {
    utterance = utterance.toLowerCase()
    botresponse = botresponse.toLowerCase()
  }
  return botresponse.indexOf(utterance) >= 0
}
