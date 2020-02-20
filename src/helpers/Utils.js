const _ = require('lodash')

const isStringJson = (string) => {
  try {
    JSON.parse(string)
  } catch (e) {
    return false
  }
  return true
}

const isJsonObject = (json) => {
  try {
    JSON.stringify(json)
  } catch (e) {
    return false
  }
  return true
}

const isJson = (json) => {
  if (isStringJson(json)) {
    return json
  } else if (isJsonObject(json)) {
    return JSON.stringify(json)
  }
  return null
}

const toJsonWeak = (stringOrNot) => {
  try {
    return JSON.parse(stringOrNot)
  } catch (e) {
    return stringOrNot
  }
}

const optionalJson = (json) => {
  const body = isJson(json)
  return body ? { 'content-type': 'application/json', body: body } : { 'content-type': 'text/plain', body: json }
}

const shortenJsonString = (obj) => {
  let str = _.isString(obj) ? obj : JSON.stringify(obj, null, 2)
  const length = str.length
  if (length > 1000) {
    str = `${str.substr(0, 1000)} ... (${length - 1000} chars more)`
  }
  return str
}

const escapeJSONString = (string) => {
  if (string) {
    return ('' + string).replace(/["'\\\n\r\u2028\u2029]/g, function (character) {
      // Escape all characters not included in SingleStringCharacters and
      // DoubleStringCharacters on
      // http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.4
      switch (character) {
        case '"':
        case "'":
        case '\\':
          return '\\' + character
        // Four possible LineTerminator characters need to be escaped:
        case '\n':
          return '\\n'
        case '\r':
          return '\\r'
        case '\u2028':
          return '\\u2028'
        case '\u2029':
          return '\\u2029'
      }
    })
  }
}

module.exports = { optionalJson, isJson, isJsonObject, isStringJson, shortenJsonString, escapeJSONString, toJsonWeak }
