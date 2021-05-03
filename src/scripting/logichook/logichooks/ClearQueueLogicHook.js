
module.exports = class ClearQueueLogicHook {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  onConvoBegin ({ container }) {
    container._EmptyQueue()
  }

  onMeEnd ({ container }) {
    container._EmptyQueue()
  }

  onBotEnd ({ container }) {
    container._EmptyQueue()
  }

  onConvoEnd ({ container }) {
    container._EmptyQueue()
  }
}
