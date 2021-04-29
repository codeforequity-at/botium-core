const { BotiumError } = require('../../BotiumError')

module.exports = class BaseCountAsserter {
  constructor (context, caps = {}, getCountFn, elementName, argPos = 0) {
    this.context = context
    this.caps = caps
    this.getCountFn = getCountFn
    this.elementName = elementName
    this.argPos = argPos
  }

  _evalCount (count, arg) {
    if (!arg) return count > 0

    arg = arg.trim()
    if (arg.startsWith('<=')) return count <= parseInt(arg.slice(2))
    if (arg.startsWith('<')) return count < parseInt(arg.slice(1))
    if (arg.startsWith('>=')) return count >= parseInt(arg.slice(2))
    if (arg.startsWith('>')) return count > parseInt(arg.slice(1))
    if (arg.startsWith('==')) return count === parseInt(arg.slice(2))
    if (arg.startsWith('=')) return count === parseInt(arg.slice(1))
    return count === arg
  }

  async assertNotConvoStep (argv) {
    const { convoStep, args } = argv
    const count = await this.getCountFn(argv) || 0
    const check = (args && args.length > this.argPos && args[this.argPos]) || '>0'
    const evalResult = this._evalCount(count, check)

    if (evalResult) {
      throw new BotiumError(
        `${convoStep.stepTag}: Not expected ${this.elementName} count ${count}${check}`,
        {
          type: 'asserter',
          source: this.name,
          params: {
            args
          },
          cause: {
            not: true,
            expected: check,
            actual: count
          }
        }
      )
    }
  }

  async assertConvoStep (argv) {
    const { convoStep, args } = argv
    const count = await this.getCountFn(argv) || 0
    const check = (args && args.length > this.argPos && args[this.argPos]) || '>0'
    const evalResult = this._evalCount(count, check)

    if (!evalResult) {
      throw new BotiumError(
        `${convoStep.stepTag}: Expected ${this.elementName} count ${count}${check}`,
        {
          type: 'asserter',
          source: this.name,
          params: {
            args
          },
          cause: {
            not: false,
            expected: check,
            actual: count
          }
        }
      )
    }
  }
}
