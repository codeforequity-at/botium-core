module.exports = class ConditionalLogicHook {
  constructor (context, caps, globalArgs) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
  }

  onBotPrepare ({ convo, convoStep, args }) {
    const params = JSON.parse(args[0])
    convoStep.conditional = {
      conditionGroupEnd: params.conditionGroupEnd
    }
    convoStep.conditional.skip = params.skip
  }
}
