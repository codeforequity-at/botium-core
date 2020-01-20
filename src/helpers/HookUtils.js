const util = require('util')
const path = require('path')
const fs = require('fs')
const vm = require('vm')
const esprima = require('esprima')
const _ = require('lodash')
const debug = require('debug')('botium-HookUtils')

const executeHook = async (hook, args) => {
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
      const sandbox = vm.createContext({ debug, console, process, ...args })
      vm.runInContext(hook, sandbox)
      return sandbox.result
    } catch (err) {
      throw new Error(`Calling Hook Javascript code failed: ${err.message}`)
    }
  }
  throw new Error(`Unknown hook ${typeof hook}`)
}

const getHook = (data) => {
  if (!data) {
    return null
  }

  if (_.isFunction(data)) {
    debug('found hook, type: function definition')
    return data
  }

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
    if (_.isFunction(resultWithRequire)) {
      debug(`found hook, type: require, in ${tryLoadFile}`)
      return resultWithRequire
    } else {
      throw new Error(`Cant load hook ${tryLoadFile} because it is not a function`)
    }
  }

  if (_.isString(data)) {
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
  executeHook
}
