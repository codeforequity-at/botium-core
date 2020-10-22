const util = require('util')
const debug = require('debug')('botium-core-ScriptingMemory')
const randomize = require('randomatic')
const { v1: uuidv1 } = require('uuid')
const moment = require('moment')
const { NodeVM } = require('vm2')
const _ = require('lodash')
const path = require('path')

const Capabilities = require('../Capabilities')
const { quoteRegexpString, toString } = require('./helper')
const { BotiumError } = require('./BotiumError')

// If they got parameter, then it will be a string always.
// the receiver can decide what to do with it,
// convert to int,
// split by ',' for multiple params,
// or something else
const SCRIPTING_FUNCTIONS_RAW = {
  $now: () => {
    return new Date().toLocaleString()
  },
  $now_EN: () => {
    return new Date().toLocaleString('en-EN')
  },
  $now_DE: () => {
    return moment().format('DD.MM.YYYY, HH:mm:ss')
  },
  $now_ISO: () => {
    return new Date().toISOString()
  },

  $date: (pattern) => {
    if (pattern) {
      return moment().format(pattern)
    }
    return new Date().toLocaleDateString()
  },
  $date_EN: () => {
    return new Date().toLocaleDateString('en-EN')
  },
  $date_DE: () => {
    return moment().format('YYYY.MM.DD')
  },
  $date_ISO: () => {
    return moment().format('YYYY-MM-DD')
  },

  $time: () => {
    return new Date().toLocaleTimeString()
  },
  $time_EN: () => {
    return new Date().toLocaleTimeString('en-EN')
  },
  $time_DE: () => {
    return moment().format('HH:mm:ss')
  },
  $time_ISO: () => {
    return moment().format('HH:mm:ss')
  },
  $time_HH_MM: () => {
    return moment().format('HH:mm')
  },
  $time_HH: () => {
    return moment().format('HH')
  },
  $time_H_A: () => {
    return moment().format('h A')
  },

  $timestamp: () => {
    return Date.now()
  },

  $year: () => {
    return new Date().getFullYear()
  },
  $month: () => {
    return moment().format('MMMM')
  },
  $month_MM: () => {
    return moment().format('MM')
  },
  $day_of_month: () => {
    return new Date().getDate()
  },
  $day_of_week: () => {
    return moment().format('dddd')
  },

  $random: (length) => {
    if (length == null) {
      throw Error('random function used without args!')
    }
    return randomize('0', length)
  },
  $random10: () => {
    return randomize('0', 10)
  },

  $uniqid: () => {
    return uuidv1()
  },

  $env: {
    handler: (name) => {
      if (!name) {
        throw Error('env function used without args!')
      }
      return process.env[name]
    },
    unsafe: true
  },

  $func: {
    handler: (code) => {
      if (code == null) {
        throw Error('func function used without args!')
      }
      try {
        const vm = new NodeVM({
          eval: false,
          require: false,
          sandbox: {}
        })
        return vm.run(`module.exports = (${code})`)
      } catch (err) {
        throw Error(`func function execution failed - ${err}`)
      }
    }
  }
}

const SCRIPTING_FUNCTIONS = _.mapValues(SCRIPTING_FUNCTIONS_RAW, (funcOrStruct, name) => {
  const func = funcOrStruct.handler || funcOrStruct

  return {
    handler: (caps, ...rest) => {
      if (!caps) {
        throw new Error('Caps not defined')
      }
      if (!caps[Capabilities.SECURITY_ALLOW_UNSAFE] && funcOrStruct.unsafe) {
        throw new BotiumError(
          `Security Error. Using unsafe scripting memory function ${name} is not allowed`,
          {
            type: 'security',
            subtype: 'allow unsafe',
            source: path.basename(__filename),
            cause: {
              SECURITY_ALLOW_UNSAFE: caps[Capabilities.SECURITY_ALLOW_UNSAFE],
              functionName: name
            }
          }
        )
      }
      return func(...rest)
    },
    numberOfArguments: func.length
  }
})
const RESERVED_WORDS = Object.keys(SCRIPTING_FUNCTIONS)

const apply = (container, scriptingMemory, str) => {
  if (container.caps[Capabilities.SCRIPTING_ENABLE_MEMORY]) {
    str = _apply(scriptingMemory, str, container.caps)
  }
  return str
}

const applyToArgs = (args, scriptingMemory, caps) => {
  return (args || []).map(arg => {
    return _apply(scriptingMemory, arg, caps)
  })
}

// we have two replace longer variable first. if there is $year, and $years, $years should not be found by $year
const _longestFirst = (a, b) => b.length - a.length

const _apply = (scriptingMemory, str, caps) => {
  if (str) {
    scriptingMemory = scriptingMemory || {}
    str = toString(str)

    // merge all keys: longer is stronger, type does not matter
    // Not clean: what if a variable references other variable/function?
    const allKeys = Object.keys(SCRIPTING_FUNCTIONS).concat(Object.keys(scriptingMemory)).sort(_longestFirst)
    for (const key of allKeys) {
      // scripting memory is stronger
      if (scriptingMemory[key]) {
        const keyRegexp = new RegExp(`\\${key}`, 'g')
        str = str.replace(keyRegexp, scriptingMemory[key])
      } else {
        const regex = `\\${key}(\\(.+(?<!\\\\)\\))?`
        const matches = str.match(new RegExp(regex, 'g')) || []
        for (const match of matches) {
          if (match.indexOf('(') > 0) {
            const arg = match.substring(match.indexOf('(') + 1, match.lastIndexOf(')')).replace(/\\\)/g, ')')
            str = str.replace(match, SCRIPTING_FUNCTIONS[key].handler(caps, arg))
          } else {
            str = str.replace(match, SCRIPTING_FUNCTIONS[key].handler(caps))
          }
        }
      }
    }
  }
  return str
}

const extractVarNames = (text) => {
  return ((_.isString(text) ? text.match(/\$[A-Za-z]\w+/g) : false) || [])
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
      if (_.isUndefined(expected)) return
      expected = toString(expected)

      let reExpected = expected
      if (container.caps[Capabilities.SCRIPTING_MATCHING_MODE] !== 'regexp' && container.caps[Capabilities.SCRIPTING_MATCHING_MODE] !== 'regexpIgnoreCase') {
        reExpected = _.isString(expected) ? quoteRegexpString(expected).replace(/\\\$/g, '$') : expected
      }
      const varMatches = extractVarNames(expected)
      for (let i = 0; i < varMatches.length; i++) {
        const varMatchesRegexp = new RegExp(`\\${varMatches[i]}`, 'g')
        reExpected = reExpected.replace(varMatchesRegexp, varRegex)
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
  extractVarNames,
  RESERVED_WORDS,
  SCRIPTING_FUNCTIONS
}
