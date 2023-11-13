const util = require('util')
const jp = require('jsonpath')
const _ = require('lodash')
const debug = require('debug')('botium-core-ConditionalCapabilityValueBasedLogicHook')

module.exports = class ConditionalCapabilityValueBasedLogicHook {
  constructor (context, caps, globalArgs) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
  }

  _isCapabilityValueEqual ({ capabilityName, jsonPath, value }) {
    if (jsonPath) {
      const capabilityObject = _.isObject(this.caps[capabilityName]) ? this.caps[capabilityName] : JSON.parse(this.caps[capabilityName])
      const values = jp.query(capabilityObject, jsonPath)
      return !!(values && values.length > 0 && values.includes(value))
    } else {
      return this.caps[capabilityName] === value
    }
  }

  onBotPrepare ({ convo, convoStep, args }) {
    const conditionGroupId = args[1]
    let params
    try {
      params = JSON.parse(args[0])
    } catch (e) {
      throw new Error(`ConditionalCapabilityValueBasedLogicHook: No parsable JSON object found in params: ${e}`)
    }
    convoStep.conditional = {
      conditionGroupId
    }
    convoStep.conditional.skip = !this._isCapabilityValueEqual(params)
    debug(`ConditionalCapabilityValueBasedLogicHook onBotPrepare ${convo.header.name}/${convoStep.stepTag}, args: ${util.inspect(args)}, convoStep.conditional: ${util.inspect(convoStep.conditional)}`)
  }
}
