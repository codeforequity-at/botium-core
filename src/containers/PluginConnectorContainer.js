const util = require('util')
const debug = require('debug')('botium-PluginConnectorContainer')

const Events = require('../Events')
const Capabilities = require('../Capabilities')
const BaseContainer = require('./BaseContainer')

module.exports = class PluginConnectorContainer extends BaseContainer {
  Validate () {
    return super.Validate().then(() => {
      const tryLoadPackage = `botium-connector-${this.caps[Capabilities.CONTAINERMODE]}`
      try {
        this.plugin = require(tryLoadPackage)
        debug(`Botium plugin ${tryLoadPackage} loaded`)
      } catch (err) {
        throw new Error(`Loading Botium plugin ${tryLoadPackage} failed, try "npm install ${tryLoadPackage}" - ${util.inspect(err)}`)
      }
      if (!this.plugin.PluginVersion || !this.plugin.PluginClass) {
        throw new Error(`Invalid Botium plugin ${tryLoadPackage}, expected PluginVersion, PluginClass fields`)
      }
      this.pluginInstance = new this.plugin.PluginClass({
        queueBotSays: (msg) => this._QueueBotSays(msg),
        caps: this.caps,
        sources: this.sources,
        envs: this.envs
      })
      if (!this.pluginInstance.UserSays) {
        throw new Error(`Invalid Botium plugin ${tryLoadPackage}, expected UserSays function`)
      }
      return this.pluginInstance.Validate()
    })
  }

  Build () {
    return super.Build().then(() => this.pluginInstance.Build ? this.pluginInstance.Build() : Promise.resolve()).then(() => this)
  }

  Start () {
    this.eventEmitter.emit(Events.CONTAINER_STARTING, this)

    return super.Start().then(() => this.pluginInstance.Start ? this.pluginInstance.Start() : Promise.resolve()).then(() => {
      this.eventEmitter.emit(Events.CONTAINER_STARTED, this)
      return this
    }).catch((err) => {
      this.eventEmitter.emit(Events.CONTAINER_START_ERROR, this, err)
      throw err
    })
  }

  UserSays (mockMsg) {
    return this.pluginInstance.UserSays(mockMsg).then(() => {
      this.eventEmitter.emit(Events.MESSAGE_SENTTOBOT, this, mockMsg)
      return this
    })
  }

  Stop () {
    this.eventEmitter.emit(Events.CONTAINER_STOPPING, this)

    return super.Stop().then(() => this.pluginInstance.Stop ? this.pluginInstance.Stop() : Promise.resolve()).then(() => {
      this.eventEmitter.emit(Events.CONTAINER_STOPPED, this)
      return this
    }).catch((err) => {
      this.eventEmitter.emit(Events.CONTAINER_STOP_ERROR, this, err)
      throw err
    })
  }

  Clean () {
    this.eventEmitter.emit(Events.CONTAINER_CLEANING, this)

    return (this.pluginInstance.Clean ? this.pluginInstance.Clean() : Promise.resolve()).then(() => super.Clean()).then(() => {
      this.eventEmitter.emit(Events.CONTAINER_CLEANED, this)
      return this
    }).catch((err) => {
      this.eventEmitter.emit(Events.CONTAINER_CLEAN_ERROR, this, err)
      throw err
    })
  }
}
