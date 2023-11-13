const util = require('util')
const jp = require('jsonpath')
const debug = require('debug')('botium-core-ConditionalJsonPathBasedLogicHook')

module.exports = class ConditionalJsonPathBasedLogicHook {
  constructor (context, caps, globalArgs) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
  }

  onBotPrepare ({ convo, convoStep, args, botMsg }) {
    const conditionGroupId = args[1]
    let params
    try {
      params = JSON.parse(args[0])
    } catch (e) {
      throw new Error(`ConditionalJsonPathBasedLogicHook: No parsable JSON object found in params: ${e}`)
    }
    convoStep.conditional = {
      conditionGroupId
    }
    let skip = true
    if (params.jsonPath) {
      const values = jp.query(botMsg, params.jsonPath)
      skip = !(values && values.length > 0 && values.includes(params.value))
    }
    convoStep.conditional.skip = skip
    debug(`ConditionalJsonPathBasedLogicHook onBotPrepare ${convo.header.name}/${convoStep.stepTag}, args: ${util.inspect(args)}, convoStep.conditional: ${util.inspect(convoStep.conditional)}`)
  }
}
