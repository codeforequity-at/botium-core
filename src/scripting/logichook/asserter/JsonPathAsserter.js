const { BotiumError } = require('../../BotiumError')
const { getMatchFunction } = require('../../MatchFunctions')
const { toString } = require('../../helper')
const _ = require('lodash')
const jsonPath = require('jsonpath')
const Mustache = require('mustache')

module.exports = class JsonPathAsserter {
  constructor (context, caps = {}, globalArgs = {}) {
    this.context = context
    this.caps = caps
    this.globalArgs = globalArgs
    this.name = context.ref || 'JsonPathAsserter'
  }

  assertNotConvoStep (params) {
    return this._eval(params, true)
  }

  assertConvoStep (params) {
    return this._eval(params, false)
  }

  _getConfig (convoStep, args) {
    if (this.globalArgs && this.globalArgs.path) {
      if (args && args.length > 1) {
        throw new BotiumError(`${convoStep.stepTag}: JsonPathAsserter 0 or 1 arguments expected "${toString(args)}"`,
          {
            type: 'asserter',
            subtype: 'wrong parameters',
            source: this.name,
            cause: {
              globalArgs: this.globalArgs,
              args
            }
          }
        )
      }
      return {
        path: this.globalArgs.path,
        assert: (args && args.length > 0) ? args[0] : null
      }
    } else if (this.globalArgs && this.globalArgs.pathTemplate) {
      if (_.has(this.globalArgs, 'argCount')) {
        const argCount = this.globalArgs.argCount
        if (argCount === 0 && args && args.length > 0) {
          throw new BotiumError(`${convoStep.stepTag}: JsonPathAsserter ${argCount} arguments expected "${toString(args)}"`,
            {
              type: 'asserter',
              subtype: 'wrong parameters',
              source: this.name,
              cause: {
                globalArgs: this.globalArgs,
                args
              }
            }
          )
        } else if (!args || args.length !== argCount) {
          throw new BotiumError(`${convoStep.stepTag}: JsonPathAsserter ${argCount} arguments expected "${toString(args)}"`,
            {
              type: 'asserter',
              subtype: 'wrong parameters',
              source: this.name,
              cause: {
                globalArgs: this.globalArgs,
                args
              }
            }
          )
        }
      }
      return {
        path: Mustache.render(this.globalArgs.pathTemplate, { args }),
        assert: this.globalArgs.assertTemplate ? Mustache.render(this.globalArgs.assertTemplate, { args }) : null
      }
    } else {
      if (!args || args.length === 0 || args.length > 2) {
        throw new BotiumError(`${convoStep.stepTag}: JsonPathAsserter 1 or 2 arguments expected "${toString(args)}"`,
          {
            type: 'asserter',
            subtype: 'wrong parameters',
            source: this.name,
            cause: {
              globalArgs: this.globalArgs,
              args
            }
          }
        )
      }
      return {
        path: args[0],
        assert: args.length > 1 ? args[1] : null
      }
    }
  }

  _eval ({ convo, convoStep, args, botMsg }, not) {
    if (!botMsg || !botMsg.sourceData) return Promise.resolve()

    const { path, assert } = this._getConfig(convoStep, args)
    const rawBotResponse = botMsg.sourceData

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
                globalArgs: this.globalArgs,
                args
              }
            },
            cause: {
              expected: assert || (args && `any element for ${args.join('|')}`) || (!args && `any element in ${path}`),
              actual: null,
              path
            }
          }
        ))
      }
    }
    if (assert) {
      const actual = (_.isArray(jsonPathValues) && jsonPathValues.length === 1) ? jsonPathValues[0] : jsonPathValues

      let matchFn = this.context.Match
      if (this.globalArgs && this.globalArgs.matchingMode) {
        matchFn = getMatchFunction(this.globalArgs.matchingMode)
      }

      const match = jsonPathValues.find(a => matchFn(a, assert))

      if (not && match) {
        return Promise.reject(new BotiumError(`${convoStep.stepTag}: Not expected: ${toString(actual)} in jsonPath ${path}"`,
          {
            type: 'asserter',
            source: this.name,
            context: {
              constructor: {},
              params: {
                globalArgs: this.globalArgs,
                args
              }
            },
            cause: {
              not: true,
              expected: assert,
              actual,
              path
            }
          }
        ))
      }
      if (!not && !match) {
        return Promise.reject(new BotiumError(`${convoStep.stepTag}: Expected: ${assert} in jsonPath ${path}: Actual: ${toString(actual)}`,
          {
            type: 'asserter',
            source: this.name,
            context: {
            // effective arguments getting from constructor
              constructor: {},
              params: {
                globalArgs: this.globalArgs,
                args
              }
            },
            cause: {
              not: false,
              expected: assert,
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
