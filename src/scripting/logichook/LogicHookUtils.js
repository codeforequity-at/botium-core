const { NodeVM } = require('vm2')
const path = require('path')
const fs = require('fs')
const isClass = require('is-class')
const debug = require('debug')('botium-core-asserterUtils')

const { BotiumError } = require('../BotiumError')

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
    this.globalAsserters = []
    this.logicHooks = {}
    this.globalLogicHooks = []
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
          this.globalAsserters.push(asserter.ref)
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
          this.globalLogicHooks.push(logicHook.ref)
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

  getGlobalAsserter () {
    return this.globalAsserters
      .map(name => this.asserters[name])
  }

  getGlobalLogicHook () {
    return this.globalLogicHooks
      .map(name => this.logicHooks[name])
  }

  _loadClass ({ src, ref, args }, hookType) {
    if (hookType !== 'asserter' && hookType !== 'logichook' && hookType !== 'userinput') {
      throw Error(`Unknown hookType ${hookType}`)
    }

    // 1 gives possibility to use default asserter as global asserter
    if (hookType === 'asserter') {
      const asserter = DEFAULT_ASSERTERS.find(asserter => src === asserter.className)
      if (asserter) {
        return new (asserter.Class)({ ref, ...this.buildScriptContext }, this.caps, args)
      }
    }
    if (hookType === 'logichook') {
      const lh = DEFAULT_LOGIC_HOOKS.find(lh => src === lh.className)
      if (lh) {
        return new (lh.Class)({ ref, ...this.buildScriptContext }, this.caps, args)
      }
    }
    if (hookType === 'userinput') {
      const ui = DEFAULT_USER_INPUTS.find(ui => src === ui.className)
      if (ui) {
        return new (ui.Class)({ ref, ...this.buildScriptContext }, this.caps, args)
      }
    }

    const _checkUnsafe = () => {
      if (!this.caps[Capabilities.SECURITY_ALLOW_UNSAFE]) {
        throw new BotiumError(
          'Security Error. Using unsafe component is not allowed',
          {
            type: 'security',
            subtype: 'allow unsafe',
            source: path.basename(__filename),
            cause: { src: !!src, ref, args, hookType }
          }
        )
      }
    }

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
          throw new Error(`${packageName} class or function or PluginClass field expected`)
        }
      } catch (err) {
        throw new Error(`Failed to fetch hook ${ref} ${hookType} from guessed package ${packageName} - ${err.message}`)
      }
    }

    if (isClass(src)) {
      try {
        const CheckClass = src
        return new CheckClass({ ref, ...this.buildScriptContext }, this.caps, args)
      } catch (err) {
        throw new Error(`Failed to load package ${ref} from provided class - ${err.message}`)
      }
    }
    if (_.isFunction(src)) {
      try {
        return src({ ref, ...this.buildScriptContext }, this.caps, args)
      } catch (err) {
        throw new Error(`Failed to load package ${ref} from provided function - ${err.message}`)
      }
    }
    if (_.isObject(src) && !_.isString(src)) {
      try {
        const hookObject = Object.keys(src).reduce((result, key) => {
          result[key] = (args) => {
            const script = src[key]
            if (_.isFunction(script)) {
              return script(args)
            } else if (_.isString(script)) {
              try {
                const vm = new NodeVM({
                  eval: false,
                  require: false,
                  sandbox: args
                })
                return vm.run(script)
              } catch (err) {
                throw new Error(`${err.message || err}`)
              }
            } else {
              throw new Error(`Script "${key}" is not valid - only functions and javascript code accepted`)
            }
          }
          return result
        }, {})
        return hookObject
      } catch (err) {
        throw new Error(`Failed to load package ${ref} ${hookType} from provided src function - ${err.message}`)
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
          tryLoadPackageName: src.substr(0, src.lastIndexOf('/')),
          tryLoadAsserterByName: src.substr(src.lastIndexOf('/') + 1)
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
        } else {
          throw new Error(`${src} class or function expected`)
        }
      }

      for (const tryLoad of tryLoads) {
        const tryLoadFile = path.resolve(process.cwd(), tryLoad.tryLoadPackageName)
        if (fs.existsSync(tryLoadFile)) {
          _checkUnsafe()
          try {
            return tryLoadFromSource(tryLoadFile, tryLoad.tryLoadAsserterByName)
          } catch (err) {
            loadErr.push(`Failed to fetch ${ref} ${hookType} from ${src} - ${err.message} `)
          }
        }
        try {
          return tryLoadFromSource(tryLoad.tryLoadPackageName, tryLoad.tryLoadAsserterByName)
        } catch (err) {
          loadErr.push(`Failed to fetch ${ref} ${hookType} from ${src} - ${err.message} `)
        }
      }

      loadErr.forEach(debug)
    }
    throw new Error(`Failed to fetch ${ref} ${hookType}, no idea how to load ...`)
  }
}
