const _ = require('lodash')
const util = require('util')
const { BotiumError } = require('../../BotiumError')

module.exports = class EntityValuesAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'EntityValuesAsserter'
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    let acceptMoreEntities = false
    if (args.length > 0 && ((args[args.length - 1] === '..') || (args[args.length - 1] === '...'))) {
      acceptMoreEntities = true
      args = args.slice(0, args.length - 1)
    }

    const expectedEntities = _extractCount(args)

    const currentEntities = _.has(botMsg, 'nlp.entities') ? _extractCount(botMsg.nlp.entities.map((entity) => entity.value)) : {}

    const { substracted, hasMissingEntity } = _substract(currentEntities, expectedEntities, this.context.Match)

    if (Object.keys(substracted).length === 0 || (acceptMoreEntities && !hasMissingEntity)) {
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
      `${convoStep.stepTag}: Wrong number of entity values. The difference is ${util.inspect(substractedAsArray)}`,
      {
        type: 'asserter',
        source: this.name,
        context: {
          constructor: {
          },
          params: {
            args
          },
          // intermediate? State?
          calculation: {
            acceptMoreEntities,
            currentEntities,
            expectedEntities
          }
        },
        cause: {
          expected: args,
          actual: botMsg.nlp && botMsg.nlp.entities && botMsg.nlp.entities.map((entity) => entity.value),
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

const _substract = (currentEntities, expectedEntities, Match) => {
  expectedEntities = Object.assign({}, expectedEntities)
  const substracted = {}
  let hasMissingEntity = false
  const currentNames = _.sortBy(Object.keys(currentEntities), (value) => value.length)
  const expectedNames = _.sortBy(Object.keys(expectedEntities), (value) => value.length)

  for (const currentName of currentNames) {
    let currentCount = currentEntities[currentName]
    for (let i = 0; currentCount && i < expectedNames.length; i++) {
      const expectedName = expectedNames[i]
      const expectedCount = expectedEntities[expectedName]
      if (Match(currentName, expectedName) && expectedCount) {
        expectedEntities[expectedName] = Math.max(0, expectedCount - currentCount)
        currentCount = Math.max(0, currentCount - expectedCount)
      }
    }
    if (currentCount) {
      substracted[currentName] = currentCount
    }
  }

  for (const name in expectedEntities) {
    if (expectedEntities[name]) {
      substracted[name] = -expectedEntities[name]
      hasMissingEntity = true
    }
  }

  return { substracted, hasMissingEntity }
}
