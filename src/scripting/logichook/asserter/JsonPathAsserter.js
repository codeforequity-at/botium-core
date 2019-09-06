const { BotiumError } = require('../../BotiumError')
const jsonPath = require('jsonpath')

module.exports = class JsonPathAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    if (!botMsg || !botMsg.sourceData) return Promise.resolve()
    if (!args || args.length === 0 || args.length > 2) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: JsonPathAsserter 1 or 2 arguments expected "${args}"`),
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: 'JsonPathAsserter',
          cause: { args }
        }
      )
    }

    const rawBotResponse = botMsg.sourceData
    const path = args[0]

    const jsonPathValues = jsonPath.query(rawBotResponse, path)
    if (!jsonPathValues || jsonPathValues.length === 0) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: Could not find any element in jsonPath ${path}"`,
        {
          type: 'asserter',
          source: 'JsonPathAsserter',
          context: {
            // effective arguments getting from constructor
            constructor: {},
            params: {
              args,
              botMsg
            }
          },
          cause: {
            expected: args.length > 1 ? args[1] : null,
            actual: null,
            path
          }
        }
      ))
    }
    if (args.length > 1) {
      const [ actual ] = jsonPathValues
      const expected = args[1]
      if (!this.context.Match(actual, expected)) {
        return Promise.reject(new BotiumError(`${convoStep.stepTag}: Expected: ${expected} in jsonPath ${path}"`,
          {
            type: 'asserter',
            source: 'JsonPathAsserter',
            context: {
            // effective arguments getting from constructor
              constructor: {},
              params: {
                args,
                botMsg
              }
            },
            cause: {
              expected,
              actual,
              path
            }
          }
        ))
      }
    }

    return Promise.resolve()
  }
}
