const _ = require('lodash')
const jp = require('jsonpath')

const _ensureList = (queryResult) => {
  if (_.isArray(queryResult)) {
    return queryResult
  }
  return [queryResult]
}

module.exports.precompile = (caps, scriptBuffer, options, filename) => {
  if (!filename.endsWith('.json')) {
    return
  }

  const checkerJsonpath = options.CHECKER_JSONPATH
  const rootJsonpath = options.ROOT_JSONPATH
  const utteranceRefsJsonpath = options.UTTERANCE_REF_JSONPATH
  const utterancesJsonpath = options.UTTERANCES_JSONPATH
  let scriptData = scriptBuffer
  if (_.isString(scriptData)) {
    try {
      scriptData = JSON.parse(scriptData)
    } catch (err) {
      throw new Error(`Cant convert to JSON ${filename}`)
    }
  }
  if (checkerJsonpath) {
    const scouldExist = jp.query(scriptData, checkerJsonpath)
    if (!scouldExist || scouldExist.length === 0) {
      return
    }
  }

  if (!rootJsonpath) {
    scriptData = [scriptData]
  } else {
    let rootObjects
    try {
      rootObjects = _ensureList(jp.query(scriptData, rootJsonpath))
    } catch (err) {
      throw new Error(`Root jsonpath ${rootJsonpath} invalid: ${err.message}`)
    }

    scriptData = rootObjects
  }

  const result = {}
  for (const json of scriptData) {
    let intent
    try {
      intent = _ensureList(jp.query(json, utteranceRefsJsonpath))
    } catch (err) {
      throw new Error(`Intents jsonpath ${utteranceRefsJsonpath} invalid: ${err.message}`)
    }

    if (intent.length !== 1) {
      throw new Error(`There should be exact one intent but found "${JSON.stringify(intent)}" on path "${utteranceRefsJsonpath}" in JSON "${JSON.stringify(json)}"`)
    }

    if (!result[intent]) {
      result[intent] = []
    }

    try {
      result[intent] = result[intent].concat(jp.query(json, utterancesJsonpath))
    } catch (err) {
      throw new Error(`Utterances jsonpath ${utteranceRefsJsonpath} invalid: ${err.message}`)
    }
  }

  return { scriptBuffer: JSON.stringify({ utterances: result }) }
}
