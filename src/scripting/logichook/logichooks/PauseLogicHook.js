const pause = require('../PauseLogic').pause
module.exports = class PauseLogicHook {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  onMeEnd ({ convo, convoStep, args }) {
    return pause(convoStep.stepTag, args)
  }

  onBotEnd ({ convoStep, container, args }) {
    return pause(convoStep.stepTag, args)
  }
}
