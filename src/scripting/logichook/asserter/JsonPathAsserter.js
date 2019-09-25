const { BotiumError } = require('../../BotiumError')
const jsonPath = require('jsonpath')

module.exports = class JsonPathAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'JsonPathAsserter'
  }

  assertNotConvoStep (params) {
    return this._eval(params, true)
  }

  assertConvoStep (params) {
    return this._eval(params, false)
  }

  _eval ({ convo, convoStep, args, botMsg }, not) {
    if (!botMsg || !botMsg.sourceData) return Promise.resolve()
    if (!args || args.length === 0 || args.length > 2) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: JsonPathAsserter 1 or 2 arguments expected "${args}"`),
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: { args }
        }
      )
    }

    const rawBotResponse = botMsg.sourceData
    const path = args[0]

    const jsonPathValues = jsonPath.query(rawBotResponse, path)
    if (!jsonPathValues || jsonPathValues.length === 0) {
      if (not) {
        return Promise.resolve()
      } else {
        return Promise.reject(new BotiumError(`${convoStep.stepTag}: Could not find any element in jsonPath ${path}"`,
          {
            type: 'asserter',
            source: this.name,
            context: {
            // effective arguments getting from constructor
              constructor: {},
              params: {
                args
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
    }
    if (args.length > 1) {
      const [actual] = jsonPathValues
      const expected = args[1]

      const match = this.context.Match(actual, expected)

      if (not && match) {
        return Promise.reject(new BotiumError(`${convoStep.stepTag}: Not expected: ${actual} in jsonPath ${path}"`,
          {
            type: 'asserter',
            source: this.name,
            context: {
              constructor: {},
              params: {
                args
              }
            },
            cause: {
              not: true,
              expected,
              actual,
              path
            }
          }
        ))
      }
      if (!not && !match) {
        return Promise.reject(new BotiumError(`${convoStep.stepTag}: Expected: ${expected} in jsonPath ${path}"`,
          {
            type: 'asserter',
            source: this.name,
            context: {
            // effective arguments getting from constructor
              constructor: {},
              params: {
                args
              }
            },
            cause: {
              not: false,
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
