const util = require('util')
const debug = require('debug')('botium-ScriptingMemory')
const randomize = require('randomatic')
const uuidv1 = require('uuid/v1')
const moment = require('moment')
const vm = require('vm')
const _ = require('lodash')

const Capabilities = require('../Capabilities')

// If they got parameter, then it will be a string always.
// the receiver can decide what to do with it,
// convert to int,
// split by ',' for multiple params,
// or something else
const SCRIPTING_FUNCTIONS = {
  '$now': () => {
    return new Date().toLocaleString()
  },
  '$now_EN': () => {
    return new Date().toLocaleString('en-EN')
  },
  '$now_DE': () => {
    return new Date().toLocaleString('de-DE')
  },
  '$now_ISO': () => {
    return new Date().toISOString()
  },

  '$date': (pattern) => {
    if (pattern) {
      return moment().format(pattern)
    }
    return new Date().toLocaleDateString()
  },
  '$date_EN': () => {
    return new Date().toLocaleDateString('en-EN')
  },
  '$date_DE': () => {
    return new Date().toLocaleDateString('de-DE')
  },
  '$date_ISO': () => {
    return moment().format('YYYY-MM-DD')
  },

  '$time': () => {
    return new Date().toLocaleTimeString()
  },
  '$time_EN': () => {
    return new Date().toLocaleTimeString('en-EN')
  },
  '$time_DE': () => {
    return new Date().toLocaleTimeString('de-DE')
  },
  '$time_ISO': () => {
    return moment().format('HH:mm:ss')
  },
  '$time_HH_MM': () => {
    return moment().format('HH:mm')
  },
  '$time_HH': () => {
    return moment().format('HH')
  },
  '$time_H_A': () => {
    return moment().format('h A')
  },

  '$timestamp': () => {
    return Date.now()
  },

  '$year': () => {
    return new Date().getFullYear()
  },
  '$month': () => {
    return moment().format('MMMM')
  },
  '$month_MM': () => {
    return moment().format('MM')
  },
  '$day_of_month': () => {
    return new Date().getDate()
  },
  '$day_of_week': () => {
    return moment().format('dddd')
  },

  '$random': (length) => {
    if (length == null) {
      throw Error('random function used without args!')
    }
    return randomize('0', length)
  },
  '$random10': () => {
    return randomize('0', 10)
  },

  '$uniqid': () => {
    return uuidv1()
  },

  '$func': (code) => {
    if (code == null) {
      throw Error('func function used without args!')
    }
    try {
      return vm.runInNewContext(code, { debug: debug, console: console, require: require })
    } catch (err) {
      throw Error(`func function execution failed - ${err}`)
    }
  }
}

const RESERVED_WORDS = Object.keys(SCRIPTING_FUNCTIONS)

const apply = (container, scriptingMemory, str) => {
  if (container.caps[Capabilities.SCRIPTING_ENABLE_MEMORY]) {
    str = _apply(scriptingMemory, str)
  }
  return str
}

const applyToArgs = (args, scriptingMemory) => {
  return (args || []).map(arg => {
    return _apply(scriptingMemory, arg)
  })
}

// we have two replace longer variable first. if there is $year, and $years, $years should not be found by $year
const _longestFirst = (a, b) => b.length - a.length

const _apply = (scriptingMemory, str) => {
  if (str) {
    // merge all keys: longer is stronger, type does not matter
    // Not clean: what if a variable references other variable/function?
    const allKeys = Object.keys(SCRIPTING_FUNCTIONS).concat(Object.keys(scriptingMemory)).sort(_longestFirst)
    for (const key of allKeys) {
      // scripting memory is stronger
      if (scriptingMemory[key]) {
        str = str.replace(key, scriptingMemory[key])
      } else {
        const regex = `\\${key}(\\(.+(?<!\\\\)\\))?`
        const matches = str.match(new RegExp(regex, 'g')) || []
        for (const match of matches) {
          if (match.indexOf('(') > 0) {
            const arg = match.substring(match.indexOf('(') + 1, match.lastIndexOf(')')).replace(/\\\)/g, ')')
            str = str.replace(match, SCRIPTING_FUNCTIONS[key](arg))
          } else {
            str = str.replace(match, SCRIPTING_FUNCTIONS[key]())
          }
        }
      }
    }
  }
  return str
}

const fill = (container, scriptingMemory, result, utterance, scriptingEvents) => {
  debug(`fill start: ${util.inspect(scriptingMemory)}`)
  let varRegex
  switch (container.caps[Capabilities.SCRIPTING_MEMORY_MATCHING_MODE]) {
    case 'word':
      varRegex = '(\\w+)'
      break
    case 'joker':
      varRegex = '([\\w\\W]+)'
      break
    default:
      varRegex = '(\\S+)'
      break
  }

  if (result && _.isString(result) && utterance && container.caps[Capabilities.SCRIPTING_ENABLE_MEMORY]) {
    const utterances = scriptingEvents.resolveUtterance({ utterance })
    utterances.forEach(expected => {
      let reExpected = expected
      if (container.caps[Capabilities.SCRIPTING_MATCHING_MODE] !== 'regexp') {
        reExpected = _.isString(expected) ? expected.replace(/[-\\^*+?.()|[\]{}]/g, '\\$&') : expected
      }
      const varMatches = ((_.isString(expected) ? expected.match(/\$[A-Za-z]\w+/g) : false) || []).sort(_longestFirst)
      for (let i = 0; i < varMatches.length; i++) {
        reExpected = reExpected.replace(varMatches[i], varRegex)
      }
      const resultMatches = result.match(reExpected) || []
      for (let i = 1; i < resultMatches.length; i++) {
        if (i <= varMatches.length) {
          const varName = varMatches[i - 1]
          if (RESERVED_WORDS.indexOf(varName) >= 0) {
            debug(`fill Variable "${varName}" is not overwritten, because it is reserved word. `)
          } else {
            scriptingMemory[varName] = resultMatches[i]
          }
        }
      }
    })
    debug(`fill end: ${util.inspect(scriptingMemory)}`)
  }
}

module.exports = {
  apply,
  applyToArgs,
  fill,
  RESERVED_WORDS,
  SCRIPTING_FUNCTIONS
}
