const util = require('util')
const _ = require('lodash')

const { isStringJson } = require('../../../helpers/Utils')

module.exports = class UpdateCustomLogicHook {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  onMeStart ({ convo, convoStep, args, meMsg }) {
    this._update(convoStep, args, meMsg)
  }

  _getValue (raw) {
    if (isStringJson(raw)) {
      return JSON.parse(raw)
    }
    return raw
  }

  _update (convoStep, args, context) {
    if (!args || args.length < 2) {
      return Promise.reject(new Error(`${convoStep.stepTag}: UpdateCustomLogicHook Not enough arguments argument ${util.inspect(args)}`))
    }
    if (args.length > 3) {
      return Promise.reject(new Error(`${convoStep.stepTag}: UpdateCustomLogicHook Too much arguments ${util.inspect(args)}`))
    }

    try {
      if (args.length === 2) {
        if (_.isUndefined(context[args[0]])) {
          context[args[0]] = this._getValue(args[1])
        } else {
          if (_.isString(context[args[0]])) {
            context[args[0]] = [
              context[args[0]],
              this._getValue(args[1])
            ]
          } else if (_.isArray(context[args[0]])) {
            context[args[0]].push(this._getValue(args[1]))
          } else {
            context[args[0]][this._getValue(args[1])] = true
          }
        }
      } else {
        if (_.isUndefined(context[args[0]])) {
          context[args[0]] = {}
        } else {
          if (_.isString(context[args[0]])) {
            const newVal = {}
            newVal[context[args[0]]] = true
            context[args[0]] = newVal
          } else if (_.isArray(context[args[0]])) {
            const newVal = {}
            context[args[0]].forEach(a => { newVal[a] = true })
            context[args[0]] = newVal
          }
        }
        context[args[0]][args[1]] = this._getValue(args[2])
      }
    } catch (err) {
      return Promise.reject(new Error(`${convoStep.stepTag}: UpdateCustomLogicHook Failed to set context. Arguments ${util.inspect(args)}`))
    }
    return Promise.resolve()
  }
}
