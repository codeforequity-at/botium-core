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

module.exports = { optionalJson, isJson, isJsonObject, isStringJson }
