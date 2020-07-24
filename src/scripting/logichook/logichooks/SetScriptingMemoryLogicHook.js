const debug = require('debug')('botium-core-SetScriptingMemoryLogicHook')

const { RESERVED_WORDS } = require('../../ScriptingMemory')
const { extractParams } = require('../helpers')

module.exports = class SetScriptingMemoryLogicHook {
  constructor (context, caps = {}, globalArgs = {}) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
    if (globalArgs && globalArgs.name && (RESERVED_WORDS.indexOf(globalArgs.name) >= 0)) {
      debug(`Reserved word "${globalArgs.name}" used as variable`)
    }
  }

  onConvoBegin ({ scriptingMemory, args, isGlobal }) {
    return this._setScriptingMemory(scriptingMemory, { stepTag: 'onConvoBegin' }, args, isGlobal, 'onConvoBegin')
  }

  onMeEnd ({ scriptingMemory, convoStep, args, isGlobal }) {
    return this._setScriptingMemory(scriptingMemory, convoStep, args, isGlobal, 'onMeEnd')
  }

  onBotEnd ({ scriptingMemory, convoStep, args, isGlobal }) {
    return this._setScriptingMemory(scriptingMemory, convoStep, args, isGlobal, 'onMeEnd')
  }

  _setScriptingMemory (scriptingMemory, convoStep, args, isGlobal, type) {
    let params = null
    try {
      params = extractParams({
        argNames: ['name', 'value'],
        isGlobal,
        globalArgs: this.globalArgs,
        args
      })
    } catch (err) {
      return Promise.reject(new Error(`${convoStep.stepTag}: SetScriptingMemoryLogicHook ${err.message}`))
    }
    if (RESERVED_WORDS.indexOf('$' + params.name) >= 0) {
      debug(`Reserved word "${args[0]}" used as variable`)
    }

    // args[0] cant have the whole name of the variable, because the variable names are replaced
    const name = '$' + params.name
    const value = params.value
    debug(`Set scripting memory variable "${name}" from "${scriptingMemory[name]}" to "${value}, isGlobal: ${isGlobal}, type: ${type}"`)
    scriptingMemory[name] = value

    return Promise.resolve()
  }
}
