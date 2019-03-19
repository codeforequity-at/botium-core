const debug = require('debug')('botium-SetScriptingMemoryLogicHook')
const util = require('util')

module.exports = class SetScriptingMemoryLogicHook {
  constructor (context, caps = {}, globalArgs = {}) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
  }

  onConvoBegin ({ scriptingMemory, convoStep, args, isGlobal }) {
    return this._setScriptingMemory(scriptingMemory, convoStep, args, isGlobal, 'onConvoBegin')
  }

  onMeEnd ({ scriptingMemory, convoStep, args, isGlobal }) {
    return this._setScriptingMemory(scriptingMemory, convoStep, args, isGlobal, 'onMeEnd')
  }

  onBotEnd ({ scriptingMemory, convoStep, args, isGlobal }) {
    return this._setScriptingMemory(scriptingMemory, convoStep, args, isGlobal, 'onMeEnd')
  }

  _setScriptingMemory (scriptingMemory, convoStep, args, isGlobal, type) {
    if (args && args.length > 2) {
      return Promise.reject(new Error(`${convoStep.stepTag}: SetScriptingMemoryLogicHook Too much argument ${util.inspect(args)}`))
    }

    let name = args[0] || this.globalArgs.name
    if (!name) {
      return Promise.reject(new Error(`${convoStep.stepTag}: SetScriptingMemoryLogicHook Name is missing. args: ${util.inspect(args)}, \nglobalArgs: ${util.inspect(this.globalArgs)}`))
    }

    let value = args[1] || this.globalArgs.value
    if (!value) {
      return Promise.reject(new Error(`${convoStep.stepTag}: SetScriptingMemoryLogicHook Value is missing. args: ${util.inspect(args)}, \nglobalArgs: ${util.inspect(this.globalArgs)}`))
    }
    // args[0] cant have the whole name of the variable, because the variable names are replaced
    name = '$' + name
    debug(`Set scripting memory variable "${name}" from "${scriptingMemory[name]}" to "${value}, isGlobal: ${isGlobal}, type: ${type}"`)
    scriptingMemory[name] = value

    return Promise.resolve()
  }
}
