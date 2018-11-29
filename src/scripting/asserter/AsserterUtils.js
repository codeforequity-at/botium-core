const debug = require('debug')('botium-asserterUtils')
const ButtonsAsserter = require('./ButtonsAsserter')
const MediaAsserter = require('./MediaAsserter')
const PauseAsserter = require('./PauseAsserter')
const Capabilities = require('../../Capabilities')
const util = require('util')
const _ = require('lodash')

module.exports = class AsserterUtils {
  constructor ({buildScriptContext, caps}) {
    this.asserters = {}
    this.globalAsserters = []
    this.buildScriptContext = buildScriptContext
    this.caps = caps
    this._setDefaultAsserters()
    this._fetchAsserters()
  }

  _setDefaultAsserters () {
    this.asserters['BUTTONS'] = new ButtonsAsserter(this.buildScriptContext, this.caps)
    this.asserters['MEDIA'] = new MediaAsserter(this.buildScriptContext, this.caps)
    this.asserters['PAUSE'] = new PauseAsserter(this.buildScriptContext, this.caps)
    debug(`Loaded Default asserter - ${util.inspect(this.asserters)}`)
  }

  _fetchAsserters () {
    this.caps[Capabilities.ASSERTERS]
      .map(asserter => {
        if (this.asserters[asserter.ref]) {
          throw new Error(`${asserter.ref} asserter already exists.`)
        }
        this.asserters[asserter.ref] = this._loadAsserterClass(asserter)
        debug(`Loaded ${asserter.ref} SUCCESSFULLY - ${util.inspect(asserter)}`)
        if (asserter.global) {
          this.globalAsserters.push(asserter.ref)
          debug(`global asserter: ${asserter.ref} was set and will be executed in every convo`)
        }
      })
  }

  getGlobalAsserter () {
    return this.globalAsserters
      .map(name => this.asserters[name])
  }

  _loadAsserterClass ({src, ref}) {
    if (!src) {
      let packageName = `botium-asserter-${ref}`
      try {
        const Asserter = require(packageName)
        return new Asserter(this.buildScriptContext, this.caps)
      } catch (err) {
        throw new Error(`Failed to fetch package ${packageName} - ${util.inspect(err)}`)
      }
    }
    if (_.isFunction(src)) {
      try {
        const Asserter = src()
        return new Asserter(this.buildScriptContext, this.caps)
      } catch (err) {
        throw new Error(`Failed to load package ${ref} from provided function - ${util.inspect(err)}`)
      }
    }
    try {
      const Asserter = require(src)
      debug(`Loaded ${ref} asserter successfully`)
      return new Asserter(this.buildScriptContext, this.caps)
    } catch (err) {
      throw new Error(`Failed to fetch ${ref} asserter from ${src} - ${util.inspect(err)} `)
    }
  }
}
