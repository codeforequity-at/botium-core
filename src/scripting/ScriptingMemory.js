const _ = require('lodash')
const util = require('util')
const debug = require('debug')('botium-ScriptingMemory')
const randomize = require('randomatic')
const uuidv1 = require('uuid/v1')
const moment = require('moment')

const Capabilities = require('../Capabilities')

const SCRIPTING_FUNCTIONS = {
  '$now': () => {
    return new Date().toLocaleString()
  },
  '$date': () => {
    return new Date().toLocaleDateString()
  },
  '$year': () => {
    return new Date().getFullYear()
  },
  '$month': () => {
    return moment().format('mmmm')
  },
  '$day_of_month': () => {
    return new Date().getDate()
  },
  '$day_of_week': () => {
    return moment().format('dddd')
  },
  '$now_ISO': () => {
    return new Date().toISOString()
  },
  '$time': () => {
    return new Date().toLocaleTimeString()
  },
  '$random10': () => {
    return randomize('0', 10)
  },
  '$uniqid ': () => {
    return uuidv1()
  }
}

const apply = (container, scriptingMemory, str) => {
  if (str && container.caps[Capabilities.SCRIPTING_ENABLE_MEMORY]) {
    _.forOwn(scriptingMemory, (value, key) => {
      str = str.replace(key, value)
    })
  }
  return str
}

const applyToArgs = (args, scriptingMemory) => {
  return (args || []).map(arg => {
    _.forOwn(scriptingMemory, (value, key) => {
      arg = arg.replace(key, value)
    })
    return arg
  })
}

const fill = (container, scriptingMemory, result, utterance, scriptingEvents) => {
  debug(`fill start: ${util.inspect(scriptingMemory)}`)
  if (result && utterance && container.caps[Capabilities.SCRIPTING_ENABLE_MEMORY]) {
    const utterances = scriptingEvents.resolveUtterance({ utterance })
    utterances.forEach(expected => {
      let reExpected = expected
      if (container.caps[Capabilities.SCRIPTING_MATCHING_MODE] !== 'regexp') {
        reExpected = expected.replace(/[-\\^*+?.()|[\]{}]/g, '\\$&')
      }
      const varMatches = expected.match(/\$\w+/g) || []
      for (let i = 0; i < varMatches.length; i++) {
        reExpected = reExpected.replace(varMatches[i], '(\\w+)')
      }
      const resultMatches = result.match(reExpected) || []
      for (let i = 1; i < resultMatches.length; i++) {
        if (i <= varMatches.length) {
          scriptingMemory[varMatches[i - 1]] = resultMatches[i]
        }
      }
    })
    debug(`fill end: ${util.inspect(scriptingMemory)}`)
  }
}

module.exports = {
  apply,
  applyToArgs,
  fill
}
