const _ = require('lodash')
const util = require('util')
const { BotiumError } = require('../../BotiumError')

module.exports = class FormsAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'FormsAsserter'
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    let acceptMoreForms = false
    if (args.length > 0 && ((args[args.length - 1] === '..') || (args[args.length - 1] === '...'))) {
      acceptMoreForms = true
      args = args.slice(0, args.length - 1)
    }

    const expectedForms = _extractCount(args)

    const currentForms = _.has(botMsg, 'forms') ? _extractCount(botMsg.forms.map((entity) => entity.name)) : {}

    const { substracted, hasMissingEntityEntity } = _substract(currentForms, expectedForms)

    if (Object.keys(substracted).length === 0 || (acceptMoreForms && !hasMissingEntityEntity)) {
      return Promise.resolve()
    }

    const substractedAsArray = []
    Object.keys(substracted).forEach((key) => substractedAsArray.push({ entity: key, diff: substracted[key] }))
    substractedAsArray.sort(
      (o1, o2) => {
        if (o1.entity < o2.entity) { return -1 }
        if (o1.entity > o2.entity) { return 1 }
        return 0
      }
    )
    return Promise.reject(new BotiumError(
      `${convoStep.stepTag}: Wrong number of forms. The difference is ${util.inspect(substractedAsArray)}`,
      {
        type: 'asserter',
        source: this.name,
        context: {
          constructor: {
          },
          params: {
            args
          },
          calculation: {
            acceptMoreForms,
            currentForms,
            expectedForms
          }
        },
        cause: {
          expected: args,
          actual: botMsg.forms && botMsg.forms.map((entity) => entity.name),
          diff: substractedAsArray
        }
      }
    ))
  }
}

const _extractCount = (toCount) => {
  const result = {}
  toCount.forEach((item) => {
    if (result[item]) {
      result[item] += result[item]
    } else {
      result[item] = 1
    }
  })

  return result
}

const _substract = (first, second) => {
  const substracted = {}
  let hasMissingEntity = false

  for (const key in first) {
    if (second[key]) {
      if (first[key] - second[key] !== 0) {
        substracted[key] = first[key] - second[key]
        if (substracted[key] < 0) {
          hasMissingEntity = true
        }
      }
    } else {
      substracted[key] = first[key]
    }
  }

  for (const key in second) {
    if (!first[key]) {
      substracted[key] = -second[key]
      hasMissingEntity = true
    }
  }

  return { substracted, hasMissingEntity }
}
