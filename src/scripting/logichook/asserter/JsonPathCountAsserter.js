const jsonPath = require('jsonpath')
const { BotiumError } = require('../../BotiumError')
const BaseCountAsserter = require('./BaseCountAsserter')

const _jsonPathCount = ({ botMsg, args }) => {
  const jsonPathValues = jsonPath.query(botMsg.sourceData, args[0])
  if (jsonPathValues.length === 0) return 0
  else return jsonPathValues[0].length
}

module.exports = class JsonPathCountAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, _jsonPathCount, 'JsonPath', 1)
    this.name = 'JsonPathCountAsserter'
  }

  _evalArgs (argv) {
    const { args, convoStep } = argv

    if (!args || args.length < 1 || args.length > 2) {
      throw new BotiumError(`${convoStep.stepTag}: JsonPathCountAsserter 1 or 2 arguments expected "${args}"`,
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: {
            args
          }
        }
      )
    }
  }

  assertNotConvoStep (argv) {
    this._evalArgs(argv)
    return super.assertNotConvoStep(argv)
  }

  assertConvoStep (argv) {
    this._evalArgs(argv)
    return super.assertConvoStep(argv)
  }
}
