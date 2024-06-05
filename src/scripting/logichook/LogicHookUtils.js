const util = require('util')
const path = require('path')
const fs = require('fs')
const isClass = require('is-class')
const debug = require('debug')('botium-core-asserterUtils')

const { DEFAULT_ASSERTERS, DEFAULT_LOGIC_HOOKS, DEFAULT_USER_INPUTS } = require('./LogicHookConsts')

DEFAULT_ASSERTERS.forEach((asserter) => {
  asserter.Class = require(`./asserter/${asserter.className}`)
})

DEFAULT_LOGIC_HOOKS.forEach((logicHook) => {
  logicHook.Class = require(`./logichooks/${logicHook.className}`)
})

DEFAULT_USER_INPUTS.forEach((userInput) => {
  userInput.Class = require(`./userinput/${userInput.className}`)
})

const Capabilities = require('../../Capabilities')
const _ = require('lodash')

module.exports = class LogicHookUtils {
  constructor ({ buildScriptContext, caps }) {
    this.asserters = {}
    this.globalAsserterNames = []
    this.logicHooks = {}
    this.globalLogicHookNames = []
    this.userInputs = {}
    this.buildScriptContext = buildScriptContext
    this.caps = caps
    this._setDefaultAsserters()
    this._setDefaultLogicHooks()
    this._setDefaultUserInputs()
    this._fetchAsserters()
    this._fetchLogicHooks()
    this._fetchUserInputs()
  }

  _setDefaultAsserters () {
    DEFAULT_ASSERTERS.forEach((asserter) => {
      this.asserters[asserter.name] = new (asserter.Class)(this.buildScriptContext, this.caps)
    })
  }

  _setDefaultLogicHooks () {
    DEFAULT_LOGIC_HOOKS.forEach((lh) => {
      this.logicHooks[lh.name] = new (lh.Class)(this.buildScriptContext, this.caps)
    })
  }

  _setDefaultUserInputs () {
    DEFAULT_USER_INPUTS.forEach((ui) => {
      this.userInputs[ui.name] = new (ui.Class)(this.buildScriptContext, this.caps)
    })
  }

  _fetchAsserters () {
    this.caps[Capabilities.ASSERTERS]
      .forEach(asserter => {
        if (this.asserters[asserter.ref]) {
          debug(`${asserter.ref} asserter already exists, overwriting.`)
        }
        this.asserters[asserter.ref] = this._loadClass(asserter, 'asserter')
        if (asserter.global) {
          this.globalAsserterNames.push(asserter.ref)
        }
      })
  }

  _fetchLogicHooks () {
    this.caps[Capabilities.LOGIC_HOOKS]
      .forEach(logicHook => {
        if (this.logicHooks[logicHook.ref]) {
          debug(`${logicHook.ref} logic hook already exists, overwriting.`)
        }
        this.logicHooks[logicHook.ref] = this._loadClass(logicHook, 'logichook')
        if (logicHook.global) {
          this.globalLogicHookNames.push(logicHook.ref)
        }
      })
  }

  _fetchUserInputs () {
    this.caps[Capabilities.USER_INPUTS]
      .forEach(userInput => {
        if (this.userInputs[userInput.ref]) {
          debug(`${userInput.ref} userinput already exists, overwriting.`)
        }
        this.userInputs[userInput.ref] = this._loadClass(userInput, 'userinput')
      })
  }

  getGlobalAsserters () {
    return this.globalAsserterNames.reduce((agg, name) => ({ ...agg, [name]: this.asserters[name] }), {})
  }

  getGlobalLogicHooks () {
    return this.globalLogicHookNames.reduce((agg, name) => ({ ...agg, [name]: this.logicHooks[name] }), {})
  }

  _loadClass ({ src, ref, args }, hookType) {
    if (hookType !== 'asserter' && hookType !== 'logichook' && hookType !== 'userinput') {
      throw Error(`Unknown hookType ${hookType}`)
    }

    // 1 gives possibility to use default asserter as global asserter
    if (hookType === 'asserter') {
      const asserter = DEFAULT_ASSERTERS.find(asserter => src === asserter.className || src === asserter.name)
      if (asserter) {
        return new (asserter.Class)({ ref, ...this.buildScriptContext }, this.caps, args)
      }
    }
    if (hookType === 'logichook') {
      const lh = DEFAULT_LOGIC_HOOKS.find(lh => src === lh.className || src === lh.name)
      if (lh) {
        return new (lh.Class)({ ref, ...this.buildScriptContext }, this.caps, args)
      }
    }
    if (hookType === 'userinput') {
      const ui = DEFAULT_USER_INPUTS.find(ui => src === ui.className || src === ui.name)
      if (ui) {
        return new (ui.Class)({ ref, ...this.buildScriptContext }, this.caps, args)
      }
    }

    const allowUnsafe = !!this.caps[Capabilities.SECURITY_ALLOW_UNSAFE]

    if (!src) {
      const packageName = `botium-${hookType}-${ref}`
      try {
        const CheckClass = require(packageName)
        if (isClass(CheckClass)) {
          return new CheckClass({ ref, ...this.buildScriptContext }, this.caps, args)
        } else if (_.isFunction(CheckClass)) {
          return CheckClass({ ref, ...this.buildScriptContext }, this.caps, args)
        } else if (isClass(CheckClass.PluginClass)) {
          return new CheckClass.PluginClass({ ref, ...this.buildScriptContext }, this.caps, args)
        } else {
          throw new Error('Either class or function or PluginClass field expected')
        }
      } catch (err) {
        throw new Error(`Logic Hook specification ${ref} ${hookType} (${packageName}) invalid: ${err.message}`)
      }
    }

    const typeAsText = hookType === 'asserter' ? 'Asserter' : hookType === 'logichook' ? 'Logic Hook' : hookType === 'userinput' ? 'User Input' : 'Unknown'

    if (isClass(src)) {
      try {
        const CheckClass = src
        return new CheckClass({ ref, ...this.buildScriptContext }, this.caps, args)
      } catch (err) {
        throw new Error(`${typeAsText} specification ${ref} from class invalid: ${err.message}`)
      }
    }
    if (_.isFunction(src)) {
      try {
        return src({ ref, ...this.buildScriptContext }, this.caps, args)
      } catch (err) {
        throw new Error(`${typeAsText} specification ${ref} from function invalid: ${err.message}`)
      }
    }
    if (_.isObject(src) && !_.isString(src)) {
      try {
        const hookObject = Object.keys(src).reduce((result, key) => {
          result[key] = (args) => {
            const script = src[key]
            if (_.isFunction(script)) {
              return script(args)
            } else {
              throw new Error(`Script ${key} is not valid - only functions accepted`)
            }
          }
          return result
        }, {})
        return hookObject
      } catch (err) {
        throw new Error(`${typeAsText} specification ${ref} ${hookType} from provided src (${util.inspect(src)}) invalid: ${err.message}`)
      }
    }

    if (_.isString(src)) {
      const loadErr = []

      const tryLoads = [{
        tryLoadPackageName: src,
        tryLoadAsserterByName: null
      }]
      if (src.indexOf('/') >= 0) {
        tryLoads.push({
          tryLoadPackageName: src.substring(0, src.lastIndexOf('/')),
          tryLoadAsserterByName: src.substring(src.lastIndexOf('/') + 1)
        })
      }

      const tryLoadFromSource = (tryRequire, tryAsserterName) => {
        let CheckClass = require(tryRequire)
        if (CheckClass.default) {
          CheckClass = CheckClass.default
        }
        if (tryAsserterName) {
          if (hookType === 'asserter' && CheckClass.PluginAsserters && CheckClass.PluginAsserters[tryAsserterName]) {
            CheckClass = CheckClass.PluginAsserters[tryAsserterName]
          } else if (hookType === 'logichook' && CheckClass.PluginLogicHooks && CheckClass.PluginLogicHooks[tryAsserterName]) {
            CheckClass = CheckClass.PluginLogicHooks[tryAsserterName]
          } else {
            throw new Error(`Loaded ${tryRequire}, but ${tryAsserterName} ${hookType} not found.`)
          }
        }
        if (isClass(CheckClass)) {
          return new CheckClass({ ref, ...this.buildScriptContext }, this.caps, args)
        } else if (_.isFunction(CheckClass)) {
          return CheckClass({ ref, ...this.buildScriptContext }, this.caps, args)
        } else if (isClass(CheckClass.PluginClass)) {
          return new CheckClass.PluginClass({ ref, ...this.buildScriptContext }, this.caps, args)
        } else if (_.isFunction(CheckClass.PluginClass)) {
          return CheckClass.PluginClass({ ref, ...this.buildScriptContext }, this.caps, args)
        } else {
          throw new Error('Expected class or function')
        }
      }

      for (const tryLoad of tryLoads) {
        if (this.caps.SAFEDIR) {
          const tryLoadFile = path.resolve(this.caps.SAFEDIR, tryLoad.tryLoadPackageName)
          if (tryLoadFile.startsWith(path.resolve(this.caps.SAFEDIR))) {
            if (fs.existsSync(tryLoadFile)) {
              try {
                return tryLoadFromSource(tryLoadFile, tryLoad.tryLoadAsserterByName)
              } catch (err) {
                loadErr.push(`${typeAsText} specification ${ref} ${hookType} from "${src}" invalid: ${err.message} `)
              }
            }
          }
        }
        if (allowUnsafe || tryLoad.tryLoadPackageName.startsWith('botium-')) {
          try {
            return tryLoadFromSource(tryLoad.tryLoadPackageName, tryLoad.tryLoadAsserterByName)
          } catch (err) {
            loadErr.push(`${typeAsText} specification ${ref} ${hookType} from "${src}" invalid: ${err.message} `)
          }
        }
      }

      loadErr.forEach(debug)
    }
    throw new Error(`${typeAsText} specification ${ref} ${hookType} from "${util.inspect(src)}" invalid : no loader available`)
  }
}
