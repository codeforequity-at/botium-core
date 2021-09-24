const util = require('util')
const _ = require('lodash')

module.exports = class UpdateCustomLogicHook {
  constructor (context, caps = {}, globalArgs = {}) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
  }

  onConvoBegin ({ convo, args, isGlobal }) {
    if (isGlobal) return

    const validConvoSteps = convo.conversation.filter(s => s.sender === 'me')
    for (const convoStep of validConvoSteps) {
      convoStep.logicHooks = (convoStep.logicHooks || [])
      convoStep.logicHooks.push({
        name: 'UPDATE_CUSTOM',
        args
      })
    }
  }

  onMeStart ({ convoStep, args, meMsg, isGlobal }) {
    try {
      if (isGlobal) {
        if (!this.globalArgs) {
          return Promise.reject(new Error(`${convoStep.stepTag}: UpdateCustomLogicHook no global args given`))
        }
        if (!this.globalArgs.name) {
          return Promise.reject(new Error(`${convoStep.stepTag}: UpdateCustomLogicHook no global name arg given`))
        }
        if (!this.globalArgs.arg) {
          return Promise.reject(new Error(`${convoStep.stepTag}: UpdateCustomLogicHook no global arg arg given`))
        }
        this._update(this.globalArgs, meMsg)
      } else {
        if (!args || args.length < 2) {
          return Promise.reject(new Error(`${convoStep.stepTag}: UpdateCustomLogicHook Not enough arguments argument ${util.inspect(args)}`))
        }
        if (args.length > 3) {
          return Promise.reject(new Error(`${convoStep.stepTag}: UpdateCustomLogicHook Too much arguments ${util.inspect(args)}`))
        }
        const updateArgs = {
          name: args[0],
          arg: args[1]
        }
        if (args.length > 2) updateArgs.value = args[2]

        this._update(updateArgs, meMsg)
      }
    } catch (err) {
      return Promise.reject(new Error(`${convoStep.stepTag}: UpdateCustomLogicHook Failed to set context: ${err.message}`))
    }
    return Promise.resolve()
  }

  _getValue (raw) {
    try {
      return JSON.parse(raw)
    } catch (e) {
      return raw
    }
  }

  _update (args, meMsg) {
    if (!_.has(args, 'value')) {
      if (_.isUndefined(meMsg[args.name])) {
        meMsg[args.name] = this._getValue(args.arg)
      } else {
        if (_.isString(meMsg[args.name])) {
          meMsg[args.name] = [
            meMsg[args.name],
            this._getValue(args.arg)
          ]
        } else if (_.isArray(meMsg[args.name])) {
          meMsg[args.name].push(this._getValue(args.arg))
        } else {
          meMsg[args.name][args.arg] = true
        }
      }
    } else {
      if (_.isUndefined(meMsg[args.name])) {
        meMsg[args.name] = {}
      } else {
        if (_.isString(meMsg[args.name])) {
          const newVal = {}
          newVal[meMsg[args.name]] = true
          meMsg[args.name] = newVal
        } else if (_.isArray(meMsg[args.name])) {
          const newVal = {}
          meMsg[args.name].forEach(a => { newVal[a] = true })
          meMsg[args.name] = newVal
        }
      }
      meMsg[args.name][args.arg] = this._getValue(args.value)
    }
  }
}
