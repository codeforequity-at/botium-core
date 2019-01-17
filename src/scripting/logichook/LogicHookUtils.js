const util = require('util')
const path = require('path')
const isClass = require('is-class')
const debug = require('debug')('botium-asserterUtils')
const ButtonsAsserter = require('./asserter/ButtonsAsserter')
const MediaAsserter = require('./asserter/MediaAsserter')
const PauseAsserter = require('./asserter/PauseAsserter')
const PauseLogicHook = require('./PauseLogicHook')
const WaitForBotLogicHook = require('./WaitForBotLogicHook')
const Capabilities = require('../../Capabilities')
const _ = require('lodash')

module.exports = class LogicHookUtils {
  constructor ({ buildScriptContext, caps }) {
    this.asserters = {}
    this.globalAsserters = []
    this.logicHooks = {}
    this.globalLogicHooks = []
    this.buildScriptContext = buildScriptContext
    this.caps = caps
    this._setDefaultAsserters()
    this._setDefaultLogicHooks()
    this._fetchAsserters()
    this._fetchLogicHooks()
  }

  _setDefaultAsserters () {
    this.asserters['BUTTONS'] = new ButtonsAsserter(this.buildScriptContext, this.caps)
    this.asserters['MEDIA'] = new MediaAsserter(this.buildScriptContext, this.caps)
    this.asserters['PAUSE_ASSERTER'] = new PauseAsserter(this.buildScriptContext, this.caps)
    debug(`Loaded Default asserter - ${util.inspect(Object.keys(this.asserters))}`)
  }

  _setDefaultLogicHooks () {
    this.logicHooks['PAUSE'] = new PauseLogicHook(this.buildScriptContext, this.caps)
    this.logicHooks['WAITFORBOT'] = new WaitForBotLogicHook(this.buildScriptContext, this.caps)
    debug(`Loaded Default logic hook - ${util.inspect(Object.keys(this.logicHooks))}`)
  }

  _fetchAsserters () {
    this.caps[Capabilities.ASSERTERS]
      .map(asserter => {
        if (this.asserters[asserter.ref]) {
          debug(`${asserter.ref} asserter already exists, overwriting.`)
        }
        this.asserters[asserter.ref] = this._loadClass(asserter, 'asserter')
        debug(`Loaded ${asserter.ref} SUCCESSFULLY - ${util.inspect(asserter)}`)
        if (asserter.global) {
          this.globalAsserters.push(asserter.ref)
          debug(`global asserter: ${asserter.ref} was set and will be executed in every convo`)
        }
      })
  }

  _fetchLogicHooks () {
    this.caps[Capabilities.LOGIC_HOOKS]
      .map(logicHook => {
        if (this.logicHooks[logicHook.ref]) {
          debug(`${logicHook.ref} logic hook already exists, overwriting.`)
        }
        this.logicHooks[logicHook.ref] = this._loadClass(logicHook, 'logic-hook')
        debug(`Loaded ${logicHook.ref} SUCCESSFULLY - ${util.inspect(logicHook)}`)
        if (logicHook.global) {
          this.globalLogicHooks.push(logicHook.ref)
          debug(`global logic hook: ${logicHook.ref} was set and will be executed in every convo`)
        }
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
    if (hookType !== 'asserter' && hookType !== 'logic-hook') {
      throw Error(`Unknown hookType ${hookType}`)
    }

    if (!src) {
      let packageName = `botium-${hookType}-${ref}`
      debug(`Trying to load ${ref} ${hookType} from ${packageName}`)
      try {
        const CheckClass = require(packageName)
        if (isClass(CheckClass)) {
          return new CheckClass(this.buildScriptContext, this.caps, args)
        } else if (_.isFunction(CheckClass)) {
          return CheckClass(this.buildScriptContext, this.caps, args)
        } else {
          throw new Error(`${packageName} class or function expected`)
        }
      } catch (err) {
        throw new Error(`Failed to fetch package ${packageName} - ${util.inspect(err)}`)
      }
    }
    if (isClass(src)) {
      try {
        const CheckClass = src
        return new CheckClass(this.buildScriptContext, this.caps, args)
      } catch (err) {
        throw new Error(`Failed to load package ${ref} from provided class - ${util.inspect(err)}`)
      }
    }
    if (_.isFunction(src)) {
      try {
        return src(this.buildScriptContext, this.caps, args)
      } catch (err) {
        throw new Error(`Failed to load package ${ref} from provided function - ${util.inspect(err)}`)
      }
    }
    const tryLoadPackage = src
    debug(`Trying to load ${ref} ${hookType} from ${tryLoadPackage}`)
    try {
      const CheckClass = require(tryLoadPackage)
      if (isClass(CheckClass)) {
        return new CheckClass(this.buildScriptContext, this.caps, args)
      } else if (_.isFunction(CheckClass)) {
        return CheckClass(this.buildScriptContext, this.caps, args)
      } else {
        throw new Error(`${tryLoadPackage} class or function expected`)
      }
    } catch (err) {
      debug(`Failed to fetch ${ref} ${hookType} from ${tryLoadPackage} - ${util.inspect(err)} `)
    }

    const tryLoadFile = path.resolve(process.cwd(), src)
    debug(`Trying to load ${ref} ${hookType} from ${tryLoadFile}`)
    try {
      const CheckClass = require(tryLoadFile)
      if (isClass(CheckClass)) {
        return new CheckClass(this.buildScriptContext, this.caps, args)
      } else if (_.isFunction(CheckClass)) {
        return CheckClass(this.buildScriptContext, this.caps, args)
      } else {
        throw new Error(`${tryLoadFile} class or function expected`)
      }
    } catch (err) {
      debug(`Failed to fetch ${ref} ${hookType} from ${tryLoadFile} - ${util.inspect(err)} `)
    }

    throw new Error(`Failed to fetch ${ref} ${hookType}, no idea how to load ...`)
  }
}
