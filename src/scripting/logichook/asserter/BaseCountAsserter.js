const { BotiumError } = require('../../BotiumError')

module.exports = class BaseCountAsserter {
  constructor (context, caps = {}, elementName, argPos = 0) {
    this.context = context
    this.caps = caps
    this.elementName = elementName
    this.argPos = argPos
  }

  async _getCount (argv) {
    throw new Error('_getCount not implemented')
  }

  _getBotiumErrMsg (argv, not, count, check) {
    const { convoStep } = argv
    if (not) return `${convoStep.stepTag} Not expected ${this.elementName} count ${count} to be ${check}`
    else return `${convoStep.stepTag} Expected ${this.elementName} count ${count} to be ${check}`
  }

  _getBotiumErrArgs (argv, not, count, check) {
    const { args } = argv

    return {
      type: 'asserter',
      source: this.name,
      params: {
        args
      },
      cause: {
        not: not,
        expected: check,
        actual: count
      }
    }
  }

  _evalArgs (argv) {
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
    return count === parseInt(arg)
  }

  async assertNotConvoBegin (argv) { return this._assertNot(argv) }
  async assertNotConvoStep (argv) { return this._assertNot(argv) }
  async assertNotConvoEnd (argv) { return this._assertNot(argv) }

  async assertConvoBegin (argv) { return this._assert(argv) }
  async assertConvoStep (argv) { return this._assert(argv) }
  async assertConvoEnd (argv) { return this._assert(argv) }

  async _assertNot (argv) {
    this._evalArgs(argv)

    const { args } = argv
    const count = await this._getCount(argv) || 0
    const check = (args && args.length > this.argPos && args[this.argPos]) || '>0'
    const evalResult = this._evalCount(count, check)

    if (evalResult) {
      throw new BotiumError(
        this._getBotiumErrMsg(argv, true, count, check),
        this._getBotiumErrArgs(argv, true, count, check)
      )
    }
  }

  async _assert (argv) {
    this._evalArgs(argv)

    const { args } = argv
    const count = await this._getCount(argv) || 0
    const check = (args && args.length > this.argPos && args[this.argPos]) || '>0'
    const evalResult = this._evalCount(count, check)

    if (!evalResult) {
      throw new BotiumError(
        this._getBotiumErrMsg(argv, false, count, check),
        this._getBotiumErrArgs(argv, false, count, check)
      )
    }
  }
}
