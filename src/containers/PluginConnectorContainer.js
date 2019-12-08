const util = require('util')
const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const promiseRetry = require('promise-retry')
const debug = require('debug')('botium-PluginConnectorContainer')

const Events = require('../Events')
const Capabilities = require('../Capabilities')
const BaseContainer = require('./BaseContainer')
const pluginResolver = require('./plugins/index')
const RetryHelper = require('../helpers/RetryHelper')

const getModuleVersionSafe = (required) => {
  try {
    const pckg = require(required + '/package.json')
    if (pckg.version === undefined) {
      return 'Not set'
    } else {
      return pckg.version
    }
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      return 'Unknown error while determining version'
    }
    return 'Unknown version'
  }
}
const tryLoadPlugin = (containermode, modulepath, args) => {
  const pluginLoaderSpec = modulepath || containermode

  if (pluginResolver(pluginLoaderSpec)) {
    const pluginInstance = new (pluginResolver(pluginLoaderSpec))(args)
    debug('Botium plugin loaded from internal plugin resolver')
    return pluginInstance
  }
  if (_.isFunction(pluginLoaderSpec)) {
    const pluginInstance = pluginLoaderSpec(args)
    debug('Botium plugin loaded from function call')
    return pluginInstance
  }
  const loadErr = []

  if (_.isString(pluginLoaderSpec)) {
    const tryLoadFile = path.resolve(process.cwd(), pluginLoaderSpec)
    if (fs.existsSync(tryLoadFile)) {
      try {
        const plugin = require(tryLoadFile)
        if (!plugin.PluginVersion || !plugin.PluginClass) {
          debug(`Invalid Botium plugin loaded from ${tryLoadFile}, expected PluginVersion, PluginClass fields`)
        } else {
          const pluginInstance = new plugin.PluginClass(args)
          debug(`Botium plugin loaded from ${tryLoadFile}`)
          return pluginInstance
        }
      } catch (err) {
        loadErr.push(`Loading Botium plugin from ${tryLoadFile} failed - ${util.inspect(err)}`)
      }
    }
    try {
      const plugin = require(pluginLoaderSpec)
      if (!plugin.PluginVersion || !plugin.PluginClass) {
        debug(`Invalid Botium plugin loaded from ${pluginLoaderSpec}, expected PluginVersion, PluginClass fields`)
      } else {
        const pluginInstance = new plugin.PluginClass(args)
        debug(`Botium plugin loaded from ${pluginLoaderSpec}. Plugin version is ${getModuleVersionSafe(pluginLoaderSpec)}`)
        return pluginInstance
      }
    } catch (err) {
      loadErr.push(`Loading Botium plugin from ${pluginLoaderSpec} failed - ${util.inspect(err)}`)
    }
    const tryLoadPackage = `botium-connector-${pluginLoaderSpec}`
    try {
      const plugin = require(tryLoadPackage)
      if (!plugin.PluginVersion || !plugin.PluginClass) {
        debug(`Invalid Botium plugin ${tryLoadPackage}, expected PluginVersion, PluginClass fields`)
      } else {
        const pluginInstance = new plugin.PluginClass(args)
        debug(`Botium plugin ${tryLoadPackage} loaded. Plugin version is ${getModuleVersionSafe(tryLoadPackage)}`)
        return pluginInstance
      }
    } catch (err) {
      loadErr.push(`Loading Botium plugin ${tryLoadPackage} failed, try "npm install ${tryLoadPackage}" - ${util.inspect(err)}`)
    }
  }
  loadErr.forEach(debug)
}

module.exports = class PluginConnectorContainer extends BaseContainer {
  Validate () {
    return super.Validate().then(() => {
      this.pluginInstance = tryLoadPlugin(
        this.caps[Capabilities.CONTAINERMODE],
        this.caps[Capabilities.PLUGINMODULEPATH],
        {
          container: this,
          queueBotSays: (msg) => this._QueueBotSays(msg),
          eventEmitter: this.eventEmitter,
          caps: this.caps,
          sources: this.sources,
          envs: this.envs
        })
      if (!this.pluginInstance) {
        throw new Error('Loading Botium plugin failed')
      }
      if (!this.pluginInstance.UserSays) {
        throw new Error('Invalid Botium plugin, expected UserSays function')
      }
      return this.pluginInstance.Validate ? (this.pluginInstance.Validate() || Promise.resolve()) : Promise.resolve()
    }).then(() => {
      this.retryHelperBuild = new RetryHelper(this.caps, 'BUILD')
      this.retryHelperStart = new RetryHelper(this.caps, 'START')
      this.retryHelperUserSays = new RetryHelper(this.caps, 'USERSAYS')
      this.retryHelperStop = new RetryHelper(this.caps, 'STOP')
      this.retryHelperClean = new RetryHelper(this.caps, 'CLEAN')
    })
  }

  Build () {
    try {
      return super.Build().then(() => promiseRetry((retry, number) => {
        return (this.pluginInstance.Build ? (this.pluginInstance.Build() || Promise.resolve()) : Promise.resolve())
          .catch((err) => {
            if (this.retryHelperBuild.shouldRetry(err)) {
              debug(`Build trial #${number} failed, retry activated`)
              retry(err)
            } else {
              throw err
            }
          })
      }, this.retryHelperBuild.retrySettings))
        .then(() => this)
    } catch (err) {
      return Promise.reject(new Error(`Build - Botium plugin failed: ${util.inspect(err)}`))
    }
  }

  Start () {
    this.eventEmitter.emit(Events.CONTAINER_STARTING, this)

    try {
      return super.Start().then(() => promiseRetry((retry, number) => {
        return (this.pluginInstance.Start ? (this.pluginInstance.Start() || Promise.resolve()) : Promise.resolve())
          .catch((err) => {
            if (this.retryHelperStart.shouldRetry(err)) {
              debug(`Start trial #${number} failed, retry activated`)
              retry(err)
            } else {
              throw err
            }
          })
      }, this.retryHelperStart.retrySettings))
        .then((context) => {
          this.eventEmitter.emit(Events.CONTAINER_STARTED, this, context)
          return this
        }).catch((err) => {
          this.eventEmitter.emit(Events.CONTAINER_START_ERROR, this, err)
          throw err
        })
    } catch (err) {
      this.eventEmitter.emit(Events.CONTAINER_START_ERROR, this, err)
      return Promise.reject(new Error(`Start - Botium plugin failed: ${util.inspect(err)}`))
    }
  }

  UserSaysImpl (mockMsg) {
    try {
      return promiseRetry((retry, number) => {
        return (this.pluginInstance.UserSays(mockMsg) || Promise.resolve())
          .catch((err) => {
            if (this.retryHelperUserSays.shouldRetry(err)) {
              debug(`UserSays trial #${number} failed, retry activated`)
              retry(err)
            } else {
              throw err
            }
          })
      }, this.retryHelperUserSays.retrySettings)
        .then(() => {
          this.eventEmitter.emit(Events.MESSAGE_SENTTOBOT, this, mockMsg)
          return this
        })
    } catch (err) {
      return Promise.reject(new Error(`UserSays - Botium plugin failed: ${util.inspect(err)}`))
    }
  }

  Stop () {
    this.eventEmitter.emit(Events.CONTAINER_STOPPING, this)

    try {
      return super.Stop().then(() => promiseRetry((retry, number) => {
        return (this.pluginInstance.Stop ? (this.pluginInstance.Stop() || Promise.resolve()) : Promise.resolve())
          .catch((err) => {
            if (this.retryHelperStop.shouldRetry(err)) {
              debug(`Stop trial #${number} failed, retry activated`)
              retry(err)
            } else {
              throw err
            }
          })
      }, this.retryHelperStop.retrySettings))
        .then((context) => {
          this.eventEmitter.emit(Events.CONTAINER_STOPPED, this, context)
          return this
        }).catch((err) => {
          this.eventEmitter.emit(Events.CONTAINER_STOP_ERROR, this, err)
          throw err
        })
    } catch (err) {
      this.eventEmitter.emit(Events.CONTAINER_STOP_ERROR, this, err)
      return Promise.reject(new Error(`Stop - Botium plugin failed: ${util.inspect(err)}`))
    }
  }

  Clean () {
    this.eventEmitter.emit(Events.CONTAINER_CLEANING, this)
    try {
      return promiseRetry((retry, number) => {
        return (this.pluginInstance.Clean ? (this.pluginInstance.Clean() || Promise.resolve()) : Promise.resolve())
          .catch((err) => {
            if (this.retryHelperClean.shouldRetry(err)) {
              debug(`Clean trial #${number} failed, retry activated`)
              retry(err)
            } else {
              throw err
            }
          })
      }, this.retryHelperClean.retrySettings)
        .then(() => super.Clean()).then(() => {
          this.eventEmitter.emit(Events.CONTAINER_CLEANED, this)
          return this
        }).catch((err) => {
          this.eventEmitter.emit(Events.CONTAINER_CLEAN_ERROR, this, err)
          throw err
        })
    } catch (err) {
      this.eventEmitter.emit(Events.CONTAINER_CLEAN_ERROR, this, err)
      return Promise.reject(new Error(`Clean - Botium plugin failed: ${util.inspect(err)}`))
    }
  }
}
