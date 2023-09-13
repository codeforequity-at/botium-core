const util = require('util')
const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const debug = require('debug')('botium-core-HookUtils')

const Capabilities = require('../Capabilities')

const executeHook = async (caps, hook, args) => {
  return executeHookSync(caps, hook, args)
}

const executeHookSync = (caps, hook, args) => {
  if (!hook) {
    return
  }

  if (_.isFunction(hook)) {
    try {
      return hook(args)
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
    let tryLoadFile = null
    let resultWithRequire = null

    if (caps.SAFEDIR) {
      tryLoadFile = path.resolve(caps.SAFEDIR, data)
      if (tryLoadFile.startsWith(path.resolve(caps.SAFEDIR))) {
        if (fs.existsSync(tryLoadFile)) {
          try {
            resultWithRequire = require(tryLoadFile)
          } catch (err) {
          }
        }
      }
    }
    if (!resultWithRequire && allowUnsafe) {
      tryLoadFile = data
      try {
        resultWithRequire = require(tryLoadFile)
      } catch (err) {
      }
    }

    if (resultWithRequire) {
      if (_.isFunction(resultWithRequire)) {
        debug(`found hook, type: require, in ${tryLoadFile}`)
        return resultWithRequire
      } else {
        throw new Error(`Cant load hook ${tryLoadFile} because it is not a function`)
      }
    }
  }
  throw new Error(`Not valid hook ${util.inspect(data)}`)
}

module.exports = {
  getHook,
  executeHook,
  executeHookSync
}
