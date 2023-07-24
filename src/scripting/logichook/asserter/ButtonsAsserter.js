const _ = require('lodash')
const { SCRIPTING_NORMALIZE_TEXT } = require('../../../Capabilities')
const { BotiumError } = require('../../BotiumError')
const { buttonsFromMsg } = require('../helpers')
const { normalizeText } = require('../../helper')

module.exports = class ButtonsAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'Buttons Asserter'
  }

  _evalButtons (args, botMsg) {
    const allButtons = buttonsFromMsg(botMsg, true).map(b => ({ text: b.text, payload: b.payload })).filter(b => b).map(b => ({ text: normalizeText(b.text, !!this.caps[SCRIPTING_NORMALIZE_TEXT]), payload: b.payload }))
    if (!args || args.length === 0) {
      return { allButtons, buttonsNotFound: [], buttonsFound: allButtons.map(b => b.text) }
    }
    const buttonsNotFound = []
    const buttonsFound = []
    const parsePayload = (payload) => {
      if (_.isNil(payload)) {
        return undefined
      }
      try {
        return JSON.parse(payload)
      } catch (e) {
        return payload
      }
    }
    for (let i = 0; i < (args || []).length; i++) {
      const matchByText = allButtons.some(b => this.context.Match(b.text, normalizeText(args[i], !!this.caps[SCRIPTING_NORMALIZE_TEXT])))
      const matchByPayload = allButtons.some(b => _.isEqual(parsePayload(b.payload), parsePayload(args[i])))
      if (matchByText || matchByPayload) {
        buttonsFound.push(args[i])
      } else {
        buttonsNotFound.push(args[i])
      }
    }
    return { allButtons, buttonsNotFound, buttonsFound }
  }

  assertNotConvoStep ({ convo, convoStep, args = [], botMsg = [] }) {
    const { allButtons, buttonsFound } = this._evalButtons(args, botMsg)

    if (buttonsFound.length > 0) {
      return Promise.reject(new BotiumError(
        `${convoStep.stepTag}: Not expected button(s) with text "${buttonsFound}"`,
        {
          type: 'asserter',
          source: this.name,
          params: {
            args
          },
          cause: {
            not: true,
            expected: args,
            actual: JSON.stringify(allButtons, null, 2),
            diff: buttonsFound
          }
        }
      ))
    }
    return Promise.resolve()
  }

  assertConvoStep ({ convo, convoStep, args = [], botMsg = [] }) {
    const { allButtons, buttonsNotFound, buttonsFound } = this._evalButtons(args, botMsg)

    if (!args || args.length === 0) {
      if (!buttonsFound.length) {
        return Promise.reject(new BotiumError(
          `${convoStep.stepTag}: Expected some button(s)`,
          {
            type: 'asserter',
            source: this.name,
            params: {
              args
            },
            cause: {
              not: false,
              expected: args,
              actual: JSON.stringify(allButtons, null, 2),
              diff: buttonsNotFound
            }
          }
        ))
      }
    } else if (buttonsNotFound.length > 0) {
      return Promise.reject(new BotiumError(
          `${convoStep.stepTag}: Expected button(s) with text "${buttonsNotFound}"`,
          {
            type: 'asserter',
            source: this.name,
            params: {
              args
            },
            cause: {
              not: false,
              expected: args,
              actual: JSON.stringify(allButtons, null, 2),
              diff: buttonsNotFound
            }
          }
      ))
    }
    return Promise.resolve()
  }
}
