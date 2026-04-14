import jsonPath from 'jsonpath'
import { BotiumError } from '../../BotiumError.js'
import BaseCountAsserter from './BaseCountAsserter.js'

const _jsonPathCount = ({ botMsg, args }) => {
  const jsonPathValues = jsonPath.query(botMsg.sourceData, args[0])
  if (jsonPathValues.length === 0) return 0
  else return jsonPathValues[0].length
}

export default class JsonPathCountAsserter extends BaseCountAsserter {
  constructor (context, caps = {}) {
    super(context, caps, 'JsonPath', 1)
    this.name = 'JsonPath Count Asserter'
  }

  async _getCount (argv) { return _jsonPathCount(argv) }

  _evalArgs (argv) {
    const { args, convoStep } = argv

    if (!args || args.length < 1 || args.length > 2) {
      throw new BotiumError(`${convoStep.stepTag}: ${this.name} 1 or 2 arguments expected "${args}"`,
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
};
