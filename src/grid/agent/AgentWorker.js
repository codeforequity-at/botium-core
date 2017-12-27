const util = require('util')
const debug = require('debug')('botium-AgentWorker')

const BotDriver = require('../../BotDriver')
const Events = require('../../Events')
const Commands = require('../../Commands')

module.exports = class AgentWorker {
  constructor (capsDefault, socket) {
    this.driver = null
    this.container = null
    this.capsDefault = capsDefault
    this.socket = socket
    this.socket.on(Commands.BUILD_CONTAINER, this.Build.bind(this))
    this.socket.on(Commands.START_CONTAINER, this.Start.bind(this))
    this.socket.on(Commands.SENDTOBOT, this.UserSays.bind(this))
    this.socket.on(Commands.STOP_CONTAINER, this.Stop.bind(this))
    this.socket.on(Commands.CLEAN_CONTAINER, this.Clean.bind(this))
    this.socket.on('disconnect', this.Clean.bind(this))
    this.socket.on('error', this.Clean.bind(this))
  }

  Build (caps = {}, sources = {}, env = {}) {
    debug(`Build ${JSON.stringify(caps)}, ${JSON.stringify(sources)}, ${JSON.stringify(env)}`)

    if (this.driver || this.container) {
      return this.socket.emit(Events.CONTAINER_BUILD_ERROR, `build already called`)
    }

    caps = Object.assign(caps, this.capsDefault)

    this.driver = new BotDriver(caps, sources, env)
    this.driver.on(Events.CONTAINER_BUILDING, () => this.socket.emit(Events.CONTAINER_BUILDING))
    this.driver.on(Events.CONTAINER_BUILT, () => this.socket.emit(Events.CONTAINER_BUILT))
    this.driver.on(Events.CONTAINER_BUILD_ERROR, (err) => this.socket.emit(Events.CONTAINER_BUILD_ERROR, err.message ? err.message : err))
    this.driver.on(Events.CONTAINER_STARTING, () => this.socket.emit(Events.CONTAINER_STARTING))
    this.driver.on(Events.CONTAINER_STARTED, () => this.socket.emit(Events.CONTAINER_STARTED))
    this.driver.on(Events.CONTAINER_START_ERROR, (c, err) => this.socket.emit(Events.CONTAINER_START_ERROR, err.message ? err.message : err))
    this.driver.on(Events.CONTAINER_STOPPING, () => this.socket.emit(Events.CONTAINER_STOPPING))
    this.driver.on(Events.CONTAINER_STOPPED, () => this.socket.emit(Events.CONTAINER_STOPPED))
    this.driver.on(Events.CONTAINER_STOP_ERROR, (c, err) => this.socket.emit(Events.CONTAINER_STOP_ERROR, err.message ? err.message : err))
    this.driver.on(Events.CONTAINER_CLEANING, () => this.socket.emit(Events.CONTAINER_CLEANING))
    this.driver.on(Events.CONTAINER_CLEANED, () => this.socket.emit(Events.CONTAINER_CLEANED))
    this.driver.on(Events.CONTAINER_CLEAN_ERROR, (c, err) => this.socket.emit(Events.CONTAINER_CLEAN_ERROR, err.message ? err.message : err))
    this.driver.on(Events.BOT_CONNECTED, () => this.socket.emit(Events.BOT_CONNECTED))
    this.driver.on(Events.MESSAGE_SENTTOBOT, () => this.socket.emit(Events.MESSAGE_SENTTOBOT))
    this.driver.on(Events.MESSAGE_SENDTOBOT_ERROR, (c, err) => this.socket.emit(Events.MESSAGE_SENDTOBOT_ERROR, err.message ? err.message : err))
    this.driver.on(Events.MESSAGE_RECEIVEDFROMBOT, (c, msg) => this.socket.emit(Events.MESSAGE_RECEIVEDFROMBOT, msg))

    this.driver.Build()
      .then((container) => {
        debug(`Build succeded`)
        this.container = container
      })
      .catch((err) => {
        debug(`Build failed ${util.inspect(err)}`)
        this.driver = null
        this.container = null
      })
  }
  Start () {
    debug(`Start`)
    if (!this.container) {
      return this.socket.emit(Events.CONTAINER_START_ERROR, `container not built`)
    }
    this.container.Start()
      .then(() => {
        debug(`Start succeded`)
      })
      .catch((err) => {
        debug(`Start failed ${util.inspect(err)}`)
      })
  }
  UserSays (msg) {
    debug(`UserSays ${util.inspect(msg)}`)
    if (!this.container) {
      return this.socket.emit(Events.CONTAINER_START_ERROR, `container not built`)
    }
    this.container.UserSays(msg)
      .then(() => {
        debug(`UserSays succeded`)
      })
      .catch((err) => {
        debug(`UserSays failed ${util.inspect(err)}`)
      })
  }
  Stop () {
    debug(`Stop`)
    if (!this.container) {
      return this.socket.emit(Events.CONTAINER_STOP_ERROR, `container not built`)
    }
    this.container.Stop()
      .then(() => {
        debug(`Stop succeded`)
      })
      .catch((err) => {
        debug(`Stop failed ${util.inspect(err)}`)
      })
  }
  Clean () {
    debug(`Clean`)
    if (this.container) {
      this.container.Clean()
        .then(() => {
          debug(`Clean success`)
          this.container = null
          this.driver = null
        })
        .catch((err) => {
          debug(`Clean failed ${util.inspect(err)}`)
          this.container = null
          this.driver = null
        })
    }
  }
}
