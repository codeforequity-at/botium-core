import { pause } from '../PauseLogic.js'

export default class PauseAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'Pause Asserter'
  }

  assertConvoBegin ({ convo, args }) {
    return pause('PauseAsserter', convo.sourceTag, args)
  }

  assertConvoEnd ({ convo, args }) {
    return pause('PauseAsserter', convo.sourceTag, args)
  }
};
