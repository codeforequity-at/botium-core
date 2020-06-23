const debug = require('debug')('botium-core-ClearScriptingMemoryLogicHook')

const { RESERVED_WORDS } = require('../../ScriptingMemory')

module.exports = class ClearScriptingMemoryLogicHook {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  onConvoBegin ({ scriptingMemory, convoStep, args }) {
    return this._clearScriptingMemory(scriptingMemory, convoStep, args)
  }

  onMeEnd ({ scriptingMemory, convoStep, args }) {
    return this._clearScriptingMemory(scriptingMemory, convoStep, args)
  }

  onBotEnd ({ scriptingMemory, convoStep, args }) {
    return this._clearScriptingMemory(scriptingMemory, convoStep, args)
  }

  _clearScriptingMemory (scriptingMemory, convoStep, args) {
    if (args && args.length > 1) {
      return Promise.reject(new Error(`${convoStep.stepTag}: ClearScriptingMemoryLogicHook Too much arguments "${args}"`))
    }
    if (!args || args.length < 1) {
      return Promise.reject(new Error(`${convoStep.stepTag}: ClearScriptingMemoryLogicHook Not enough arguments "${args}"`))
    }

    // args[0] cant have the whole name of the variable, because the variable names are replaced
    const name = '$' + args[0]

    if (RESERVED_WORDS.indexOf(name) >= 0) {
      throw Error(`Reserved word "${name}" used as variable!`)
    }

    if (scriptingMemory[name]) {
      debug(`Clear scripting memory variable "${name}" value "${scriptingMemory[name]}"`)
      delete scriptingMemory[args[0]]
    } else {
      debug(`Scripting memory variable "${name}" not found`)
    }

    return Promise.resolve()
  }
}
