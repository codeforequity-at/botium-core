const pause = require('../PauseLogic').pause
module.exports = class PauseLogicHook {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  onConvoBegin ({ args }) {
    return pause('PauseLogicHook', 'onConvoBegin', args)
  }

  onMeEnd ({ convoStep, args }) {
    return pause('PauseLogicHook', convoStep.stepTag, args)
  }

  onBotEnd ({ convoStep, args }) {
    return pause('PauseLogicHook', convoStep.stepTag, args)
  }

  onConvoEnd ({ args }) {
    return pause('PauseLogicHook', 'onConvoEnd', args)
  }
}
