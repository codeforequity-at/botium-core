const _ = require('lodash')
const util = require('util')
const { BotiumError } = require('../../BotiumError')

module.exports = class EntityContentAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'EntityContentAsserter'
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    if (!args || args.length < 2) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: EntityContentAsserter Missing argument`,
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: { args }
        }
      ))
    }
    const expected = args.slice(1).sort()
    if (!_.has(botMsg, 'nlp.entities')) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: Expected entity "${args[0]}" but found nothing`,
        {
          type: 'asserter',
          source: this.name,
          context: {
            params: {
              args
            }
          },
          cause: {
            entity: args[0],
            expected,
            actual: [],
            notInActual: expected
          }
        }
      ))
    }
    const minus = (expecteds, actuals) => {
      const result = expected.concat()
      for (const actual of actuals) {
        const index = result.findIndex(candidate => this.context.Match(actual, candidate))
        if (index >= 0) {
          result.splice(index, 1)
        }
      }

      return result
    }
    const actual = botMsg.nlp.entities.filter(entity => entity.name === args[0]).map(entity => entity.value).sort()
    const notInActual = minus(expected, actual)

    if (notInActual.length === 0) {
      return Promise.resolve()
    }

    return Promise.reject(new BotiumError(
      `${convoStep.stepTag}: Missing entity content: ${util.inspect(notInActual)} of entity "${args[0]}"`,
      {
        type: 'asserter',
        source: this.name,
        context: {
          constructor: {
          },
          params: {
            args
          }
        },
        cause: {
          entity: args[0],
          expected,
          actual,
          notInActual
        }
      }
    ))
  }
}
