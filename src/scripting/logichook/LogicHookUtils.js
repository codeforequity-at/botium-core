const debug = require('debug')('botium-asserterUtils')
const ButtonsAsserter = require('./asserter/ButtonsAsserter')
const MediaAsserter = require('./asserter/MediaAsserter')
const PauseLogicHook = require('./PauseLogicHook')
const Capabilities = require('../../Capabilities')
const util = require('util')
const _ = require('lodash')

module.exports = class LogicHookUtils {
  constructor ({buildScriptContext, caps}) {
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
    debug(`Loaded Default asserter - ${util.inspect(this.asserters)}`)
  }

  _setDefaultLogicHooks () {
    this.logicHooks['PAUSE'] = new PauseLogicHook(this.buildScriptContext, this.caps)
    debug(`Loaded Default logic hook - ${util.inspect(this.logicHooks)}`)
  }

  _fetchAsserters () {
    this.caps[Capabilities.ASSERTERS]
      .map(asserter => {
        if (this.asserters[asserter.ref]) {
          throw new Error(`${asserter.ref} asserter already exists.`)
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
          throw new Error(`${logicHook.ref} logic hook already exists.`)
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

  _loadClass ({src, ref}, type) {
    if (type !== 'asserter' || type !== 'logic-hook') {
      throw Error(`Unknown type ${type}`)
    }

    if (!src) {
      let packageName = `botium-${type}-${ref}`
      try {
        const Class = require(packageName)
        return new Class(this.buildScriptContext, this.caps)
      } catch (err) {
        throw new Error(`Failed to fetch package ${packageName} - ${util.inspect(err)}`)
      }
    }
    if (_.isFunction(src)) {
      try {
        const Class = src()
        return new Class(this.buildScriptContext, this.caps)
      } catch (err) {
        throw new Error(`Failed to load package ${ref} from provided function - ${util.inspect(err)}`)
      }
    }
    try {
      const Class = require(src)
      debug(`Loaded ${ref} ${type} successfully`)
      return new Class(this.buildScriptContext, this.caps)
    } catch (err) {
      throw new Error(`Failed to fetch ${ref} ${type} from ${src} - ${util.inspect(err)} `)
    }
  }
}
