const jsonPath = require('jsonpath')
const debug = require('debug')('botium-core-AssignScriptingMemoryLogicHook')

const { RESERVED_WORDS } = require('../../ScriptingMemory')
const { extractParams } = require('../helpers')

module.exports = class AssignScriptingMemoryLogicHook {
  constructor (context, caps = {}, globalArgs = {}) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
  }

  onBotEnd ({ scriptingMemory, convoStep, args, isGlobal, botMsg }) {
    let params = null
    try {
      params = extractParams({
        argNames: ['name', 'path'],
        isGlobal,
        globalArgs: this.globalArgs,
        args
      })
    } catch (err) {
      return Promise.reject(new Error(`${convoStep.stepTag}: AssignScriptingMemoryLogicHook ${err.message}`))
    }
    const varName = '$' + params.name
    if (RESERVED_WORDS.indexOf(varName) >= 0) {
      debug(`Reserved word "${varName}" used as variable`)
    }

    const jsonPathValues = jsonPath.query(botMsg, params.path)
    if (jsonPathValues && jsonPathValues.length > 0) {
      const [varValue] = jsonPathValues
      debug(`Assign scripting memory variable "${varName}" from "${scriptingMemory[varName]}" to "${varValue}"`)
      scriptingMemory[varName] = varValue
      return Promise.resolve()
    } else {
      return Promise.reject(new Error(`${convoStep.stepTag}: AssignScriptingMemoryLogicHook no result from JSON-Path query "${params.path}"`))
    }
  }
}
