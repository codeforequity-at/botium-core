module.exports = class ConditionalLogicHook {
  constructor (context, caps, globalArgs) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
  }

  onBotPrepare ({ convo, convoStep, args }) {
    const conditionGroupId = args[1]
    let params
    try {
      params = JSON.parse(args[0])
    } catch (e) {
      throw new Error(`ConditionalCapabilityValueLogicHook: No parsable JSON object found in params: ${e}`)
    }
    convoStep.conditional = {
      conditionGroupId
    }
    convoStep.conditional.skip = params.skip
  }
}
