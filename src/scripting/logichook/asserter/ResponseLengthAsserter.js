const _ = require('lodash')
const { BotiumError } = require('../../BotiumError')

module.exports = class ResponseLengthAsserter {
  constructor (context, caps = {}, globalArgs = {}) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
    if (globalArgs && globalArgs.maximumLength) {
      this.globalMaximumLength = Number(globalArgs.maximumLength)
    }
    if (globalArgs && globalArgs.maximumCount) {
      this.globalMaximumCount = Number(globalArgs.maximumCount)
    }
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    let checkLength = this.globalMaxiumLength
    let checkCount = this.globalMaximumCount
    if (args && args.length > 0) {
      checkLength = args[0]
    }
    if (args && args.length > 1) {
      checkCount = args[1]
    }

    if (!checkLength && !checkCount) return Promise.resolve()
    if (!botMsg.messageText) return Promise.resolve()

    if (checkCount && _.isArray(botMsg.messageText)) {
      if (botMsg.messageText.length > checkCount) {
        return Promise.reject(new BotiumError(`${convoStep.stepTag}: Expected maximum response count ${checkCount}, found ${botMsg.messageText.length}`,
          {
            type: 'asserter',
            source: 'ResponseCountAsserter',
            context: {
              constructor: {
                globalArgs: this.globalArgs
              },
              params: {
                args
              }
            },
            cause: {
              expected: checkCount,
              actual: botMsg.messageText.length
            }
          }
        ))
      }
    }

    if (checkLength) {
      const textsToCheck = _.isArray(botMsg.messageText) ? botMsg.messageText : [botMsg.messageText]
      for (const textToCheck of textsToCheck) {
        if (textToCheck.length > checkLength) {
          return Promise.reject(new BotiumError(`${convoStep.stepTag}: Expected maximum response length ${checkLength} characters, found ${textToCheck.length}`,
            {
              type: 'asserter',
              source: 'ResponseLengthAsserter',
              context: {
                constructor: {
                  globalArgs: this.globalArgs
                },
                params: {
                  args
                }
              },
              cause: {
                expected: checkLength,
                actual: textToCheck.length
              }
            }
          ))
        }
      }
    }
    return Promise.resolve()
  }
}
