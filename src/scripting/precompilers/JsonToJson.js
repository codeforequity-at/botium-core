const _ = require('lodash')
const jp = require('jsonpath')

const _ensureList = (queryResult) => {
  if (_.isArray(queryResult)) {
    return queryResult
  }
  return [queryResult]
}

module.exports.precompile = (scriptBuffer, capSuffixAndVal, filename) => {
  if (!filename.endsWith('.json')) {
    return
  }

  // this name can be in cap name, or in cap value. Reading it dynamical
  const checkerJsonpath = capSuffixAndVal.CHECKER_JSONPATH || capSuffixAndVal.checkerJsonpath
  const rootJsonpath = capSuffixAndVal.ROOT_JSONPATH || capSuffixAndVal.rootJsonpath
  const intentsJsonpath = capSuffixAndVal.INTENTS_JSONPATH || capSuffixAndVal.intentsJsonpath
  const utterancesJsonpath = capSuffixAndVal.UTTERANCES_JSONPATH || capSuffixAndVal.utterancesJsonpath
  let scriptData = scriptBuffer
  if (Buffer.isBuffer(scriptData)) {
    scriptData = scriptData.toString()
  }
  if (_.isString(scriptData)) {
    try {
      scriptData = JSON.parse(scriptData)
    } catch (err) {
      throw new Error(`Cant convert to JSON ${filename}`)
    }
  }
  if (checkerJsonpath) {
    const scouldExist = jp.query(scriptData, rootJsonpath)
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
      intent = _ensureList(jp.query(json, intentsJsonpath))
    } catch (err) {
      throw new Error(`Intents jsonpath ${intentsJsonpath} invalid: ${err.message}`)
    }

    if (intent.length !== 1) {
      throw new Error(`There should be exact one intent but found "${JSON.stringify(intent)}" on path "${intentsJsonpath}" in JSON "${JSON.stringify(json)}"`)
    }

    if (!result[intent]) {
      result[intent] = []
    }

    try {
      result[intent] = result[intent].concat(jp.query(json, utterancesJsonpath))
    } catch (err) {
      throw new Error(`Utterances jsonpath ${intentsJsonpath} invalid: ${err.message}`)
    }
  }

  return { scriptBuffer: JSON.stringify({ utterances: result }) }
}