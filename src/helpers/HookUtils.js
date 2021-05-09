const util = require('util')
const path = require('path')
const fs = require('fs')
const { NodeVM } = require('vm2')
const esprima = require('esprima')
const _ = require('lodash')
const debug = require('debug')('botium-core-HookUtils')

const Capabilities = require('../Capabilities')
const { BotiumError } = require('../scripting/BotiumError')

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

  if (_.isString(hook)) {
    try {
      const vm = new NodeVM({
        eval: false,
        require: false,
        sandbox: args
      })
      const r = vm.run(hook)
      if (_.isFunction(r)) {
        return r(args)
      } else {
        return r
      }
    } catch (err) {
      throw new Error(`Calling Hook Javascript code failed: ${err.message}`)
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
    let resultWithRequire
    let tryLoadFile = path.resolve(process.cwd(), data)
    if (fs.existsSync(tryLoadFile)) {
      try {
        resultWithRequire = require(tryLoadFile)
      } catch (err) {
      }
    } else {
      tryLoadFile = data
      try {
        resultWithRequire = require(data)
      } catch (err) {
      }
    }

    if (resultWithRequire) {
      if (!allowUnsafe) {
        throw new BotiumError(
          'Security Error. Using unsafe custom hook with require is not allowed',
          {
            type: 'security',
            subtype: 'allow unsafe',
            source: path.basename(__filename),
            cause: {
              SECURITY_ALLOW_UNSAFE: caps[Capabilities.SECURITY_ALLOW_UNSAFE],
              hookData: data
            }
          }
        )
      }

      if (_.isFunction(resultWithRequire)) {
        debug(`found hook, type: require, in ${tryLoadFile}`)
        return resultWithRequire
      } else {
        throw new Error(`Cant load hook ${tryLoadFile} because it is not a function`)
      }
    }

    try {
      esprima.parseScript(data)
    } catch (err) {
      throw new Error(`Cant load hook, syntax is not valid - ${util.inspect(err)}`)
    }

    debug('Found hook, type: JavaScript as String')
    return data
  }

  throw new Error(`Not valid hook ${util.inspect(data)}`)
}

module.exports = {
  getHook,
  executeHook,
  executeHookSync
}
