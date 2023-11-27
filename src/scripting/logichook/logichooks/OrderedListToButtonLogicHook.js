const _ = require('lodash')
const PATTERN = '^\\s*(\\d+)\\.'

module.exports = class OrderedListToButtonLogicHook {
  constructor (context, caps = {}, globalArgs = {}) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
  }

  onBotPrepare ({ botMsg, args }) {
    const pattern = args?.[0] || this.globalArgs?.pattern || PATTERN
    let regexp
    try {
      regexp = new RegExp(pattern, 'gm')
    } catch (err) {
      throw new Error(`OrderedListToButtonLogicHook: regex is not valid: ${pattern} ${err.messageText}`)
    }
    const buttons = []
    if (botMsg.messageText && _.isString(botMsg.messageText)) {
      const matches = botMsg.messageText.matchAll(regexp)

      for (const match of matches) {
        if (match && match[1]) {
          buttons.push({ text: match[1], payload: match[1] })
        }
      }
    }
    if (buttons.length) {
      botMsg.buttons = [...(botMsg.buttons || []), ...buttons]
    }
  }
}
