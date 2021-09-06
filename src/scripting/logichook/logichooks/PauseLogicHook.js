const pause = require('../PauseLogic').pause
module.exports = class PauseLogicHook {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  onConvoBegin ({ args }) {
    return pause('PauseLogicHook', 'onConvoBegin', args)
  }

  onMe ({ convoStep, args }) {
    return pause('PauseLogicHook', convoStep.stepTag, args)
  }

  onBot ({ convoStep, args }) {
    return pause('PauseLogicHook', convoStep.stepTag, args)
  }

  onConvoEnd ({ args }) {
    return pause('PauseLogicHook', 'onConvoEnd', args)
  }
}
