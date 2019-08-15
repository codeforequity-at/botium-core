const pause = require('../PauseLogic').pause
module.exports = class PauseLogicHook {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  onMeStart ({ convo, convoStep, args }) {
    return pause('PauseLogicHook', convoStep.stepTag, args)
  }

  onBotStart ({ convoStep, container, args }) {
    return pause('PauseLogicHook', convoStep.stepTag, args)
  }
}
