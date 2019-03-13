const debug = require('debug')('botium-SetScriptingMemoryLogicHook')

module.exports = class SetScriptingMemoryLogicHook {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  onConvoBegin ({ scriptingMemory, convoStep, args }) {
    return this._setScriptingMemory(scriptingMemory, convoStep, args)
  }

  onMeEnd ({ scriptingMemory, convoStep, args }) {
    return this._setScriptingMemory(scriptingMemory, convoStep, args)
  }

  onBotEnd ({ scriptingMemory, convoStep, args }) {
    return this._setScriptingMemory(scriptingMemory, convoStep, args)
  }

  _setScriptingMemory (scriptingMemory, convoStep, args) {
    if (args && args.length > 2) {
      return Promise.reject(new Error(`${convoStep.stepTag}: SetScriptingMemoryLogicHook Too much argument "${args}"`))
    }
    if (args && args.length < 2) {
      return Promise.reject(new Error(`${convoStep.stepTag}: SetScriptingMemoryLogicHook Not enough argument "${args}"`))
    }

    // args[0] cant have the whole name of the variable, because the variable names are replaced
    const name = '$' + args[0]
    debug(`Set scripting memory variable "${name}" from "${scriptingMemory[name]}" to "${args[1]}"`)
    scriptingMemory[name] = args[1]

    return Promise.resolve()
  }
}
