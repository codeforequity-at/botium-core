const { BotiumError } = require('../../BotiumError')

module.exports = class FormsAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'FormsAsserter'
  }

  _formTextsFromCardsRecursive (cards) {
    if (!cards) {
      return []
    }
    let result = []
    for (const card of cards) {
      result = result.concat(card.forms || [])
      result = result.concat(this._formTextsFromCardsRecursive(card.cards))
    }

    return result
  }

  _evalForms (args, botMsg) {
    const allForms = (botMsg.forms || []).concat(this._formTextsFromCardsRecursive(botMsg.cards))
    if (!args || args.length === 0) {
      return { allForms, formsNotFound: [], formsFound: allForms.map(form => form.name) }
    }
    const formsNotFound = []
    const formsFound = []
    for (let i = 0; i < (args || []).length; i++) {
      if (
        allForms.findIndex(b => b.name && b.name.toLowerCase() === args[i].toLowerCase()) >= 0 ||
        allForms.findIndex(b => b.label && b.label.toLowerCase().startsWith(args[i].toLowerCase())) >= 0
      ) {
        formsFound.push(args[i])
      } else {
        formsNotFound.push(args[i])
      }
    }
    return { allForms, formsNotFound, formsFound }
  }

  assertNotConvoStep ({ convo, convoStep, args = [], botMsg = [] }) {
    const { allForms, formsFound } = this._evalForms(args, botMsg)

    if (formsFound.length > 0) {
      return Promise.reject(new BotiumError(
        `${convoStep.stepTag}: Not expected form(s) with text "${formsFound}"`,
        {
          type: 'asserter',
          source: this.name,
          params: {
            args
          },
          cause: {
            not: true,
            expected: args,
            actual: allForms,
            diff: formsFound
          }
        }
      ))
    }
    return Promise.resolve()
  }

  assertConvoStep ({ convo, convoStep, args = [], botMsg = [] }) {
    const { allForms, formsNotFound, formsFound } = this._evalForms(args, botMsg)
    if (!formsFound.length) {
      return Promise.reject(new BotiumError(
        `${convoStep.stepTag}: Expected some form(s)`,
        {
          type: 'asserter',
          source: this.name,
          params: {
            args
          },
          cause: {
            not: false,
            expected: args,
            actual: allForms,
            diff: formsNotFound
          }
        }
      ))
    } else if (formsNotFound.length > 0) {
      return Promise.reject(new BotiumError(
        `${convoStep.stepTag}: Expected form(s) with text "${formsNotFound}"`,
        {
          type: 'asserter',
          source: this.name,
          params: {
            args
          },
          cause: {
            not: false,
            expected: args,
            actual: allForms,
            diff: formsNotFound
          }
        }
      ))
    }
    return Promise.resolve()
  }
}
