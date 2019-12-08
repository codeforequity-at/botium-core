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

module.exports = { optionalJson, isJson, isJsonObject, isStringJson, shortenJsonString }
