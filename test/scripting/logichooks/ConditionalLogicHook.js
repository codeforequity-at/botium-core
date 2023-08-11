module.exports = class ConditionalLogicHook {
  constructor (context, caps, globalArgs) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
  }

  onBotPrepare ({ convo, convoStep, args }) {
    const conditionGroupId = args.length === 2 && args[0]
    let params
    try {
      params = args[1] ? JSON.parse(args[1]) : JSON.parse(args[0])
    } catch (e) {
      throw new Error(`ConditionalCapabilityValueLogicHook: No parsable JSON object found in params: ${e}`)
    }
    convoStep.conditional = {
      conditionGroupId
    }
    convoStep.conditional.skip = params.skip
  }
}
