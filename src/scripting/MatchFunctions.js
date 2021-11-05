const _ = require('lodash')

const { toString, quoteRegexpString } = require('./helper')

const _normalize = (botresponse) => {
  if (_.isUndefined(botresponse)) return ''
  if (_.isObject(botresponse) && _.has(botresponse, 'messageText')) {
    return toString(botresponse.messageText) || ''
  }
  return toString(botresponse)
}

const regexp = (ignoreCase) => (botresponse, utterance) => {
  if (_.isUndefined(botresponse)) return false
  utterance = toString(utterance)
  botresponse = _normalize(botresponse)

  const regexp = ignoreCase ? (new RegExp(utterance, 'i')) : (new RegExp(utterance, ''))
  return regexp.test(botresponse)
}

const wildcard = (ignoreCase) => (botresponse, utterance) => {
  if (_.isUndefined(botresponse)) {
    if (utterance.trim() === '*') return true
    else return false
  }
  utterance = toString(utterance)
  botresponse = _normalize(botresponse)

  const numWildcards = utterance.split('*').length - 1
  if (numWildcards > 10) {
    throw new Error('Maximum number of 10 wildcards supported.')
  }
  const utteranceRe = quoteRegexpString(utterance).replace(/\\\*/g, '(.*)')

  const regexp = ignoreCase ? (new RegExp(utteranceRe, 'i')) : (new RegExp(utteranceRe, ''))
  return regexp.test(botresponse)
}

const wildcardExact = (ignoreCase) => (botresponse, utterance) => {
  if (_.isUndefined(botresponse)) {
    if (utterance.trim() === '*') return true
    else return false
  }
  utterance = toString(utterance)
  botresponse = _normalize(botresponse)

  const numWildcards = utterance.split('*').length - 1
  if (numWildcards > 10) {
    throw new Error('Maximum number of 10 wildcards supported.')
  }
  const utteranceRe = '^' + quoteRegexpString(utterance).replace(/\\\*/g, '(.*)') + '$'

  const regexp = ignoreCase ? (new RegExp(utteranceRe, 'i')) : (new RegExp(utteranceRe, ''))
  return regexp.test(botresponse)
}

const include = (ignoreCase) => (botresponse, utterance) => {
  if (_.isUndefined(botresponse)) return false
  utterance = toString(utterance)
  botresponse = _normalize(botresponse)

  if (ignoreCase) {
    utterance = utterance.toLowerCase()
    botresponse = botresponse.toLowerCase()
  }
  return botresponse.indexOf(utterance) >= 0
}

const equals = (ignoreCase) => (botresponse, utterance) => {
  if (_.isUndefined(botresponse)) return false
  utterance = toString(utterance)
  botresponse = _normalize(botresponse)

  if (ignoreCase) {
    utterance = utterance.toLowerCase()
    botresponse = botresponse.toLowerCase()
  }
  return botresponse === utterance
}

const getMatchFunction = (matchingMode) => {
  if (matchingMode === 'regexp' || matchingMode === 'regexpIgnoreCase') {
    return regexp(matchingMode === 'regexpIgnoreCase')
  } else if (matchingMode === 'wildcard' || matchingMode === 'wildcardIgnoreCase' || matchingMode === 'wildcardLowerCase') {
    return wildcard(matchingMode === 'wildcardIgnoreCase' || matchingMode === 'wildcardLowerCase')
  } else if (matchingMode === 'wildcardExact' || matchingMode === 'wildcardExactIgnoreCase') {
    return wildcardExact(matchingMode === 'wildcardExactIgnoreCase')
  } else if (matchingMode === 'include' || matchingMode === 'includeIgnoreCase' || matchingMode === 'includeLowerCase') {
    return include(matchingMode === 'includeIgnoreCase' || matchingMode === 'includeLowerCase')
  } else if (matchingMode === 'equals' || matchingMode === 'equalsIgnoreCase') {
    return equals(matchingMode === 'equalsIgnoreCase')
  } else {
    return equals(false)
  }
}

module.exports = {
  regexp,
  wildcard,
  wildcardExact,
  include,
  equals,
  getMatchFunction
}
