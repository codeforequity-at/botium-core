const util = require('util')
const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const debug = require('debug')('botium-core-HookUtils')

const Capabilities = require('../Capabilities')

const executeHook = async (caps, hook, ...args) => {
  return executeHookSync(caps, hook, ...args)
}

const executeHookSync = (caps, hook, ...args) => {
  if (!hook) {
    return
  }

  if (_.isFunction(hook)) {
    try {
      return hook(...args)
    } catch (err) {
      throw new Error(`Calling Hook function failed: ${err.message}`)
    }
  }

  throw new Error(`Unknown hook ${typeof hook}`)
}

const getHook = (caps, data) => {
  if (!data) {
    return null
  }
  const allowUnsafe = !!caps[Capabilities.SECURITY_ALLOW_UNSAFE]

  if (_.isFunction(data)) {
    debug('found hook, type: function definition')
    return data
  }

  if (_.isString(data)) {
    if (caps.SAFEDIR) {
      const tryLoadFile = path.resolve(caps.SAFEDIR, data)
      if (tryLoadFile.startsWith(path.resolve(caps.SAFEDIR))) {
        if (fs.existsSync(tryLoadFile)) {
          try {
            const resultWithRequire = require(tryLoadFile)
            if (_.isFunction(resultWithRequire)) {
              debug(`found hook, type: safedir, in ${tryLoadFile}`)
              return resultWithRequire
            } else {
              throw new Error(`Expected function from hook specification "${util.inspect(data)}", got: "${util.inspect(resultWithRequire)}"`)
            }
          } catch (err) {
            debug(`Failed loading hook, type: safedir, from ${tryLoadFile} failed: ${err.message || err}`)
          }
        }
      }
    }
    if (allowUnsafe || data.startsWith('botium-')) {
      const tryLoadFile = data
      try {
        const resultWithRequire = require(tryLoadFile)
        if (_.isFunction(resultWithRequire)) {
          debug(`found hook, type: require, in ${tryLoadFile}`)
          return resultWithRequire
        } else {
          throw new Error(`Expected function from hook specification "${util.inspect(data)}", got: "${util.inspect(resultWithRequire)}"`)
        }
      } catch (err) {
        debug(`Failed loading hook, type: require, from ${tryLoadFile} failed: ${err.message || err}`)
      }
    }
  }
  throw new Error(`Hook specification "${util.inspect(data)}" invalid: no loader available`)
}

module.exports = {
  getHook,
  executeHook,
  executeHookSync
}
