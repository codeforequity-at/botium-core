const util = require('util')
const async = require('async')
const debug = require('debug')('botium-core-AgentWorker')

const BotDriver = require('../../BotDriver')
const Capabilities = require('../../Capabilities')
const Events = require('../../Events')
const Commands = require('../../Commands')
const ScriptingConstants = require('../../scripting/Constants')

module.exports = class AgentWorker {
  constructor (args = { socket: null, slot: null }) {
    this.driver = null
    this.container = null
    this.args = args
    this.socket = args.socket
    if (this.socket) {
      this.socket.on(Commands.BUILD_CONTAINER, this.Build.bind(this))
      this.socket.on(Commands.START_CONTAINER, this.Start.bind(this))
      this.socket.on(Commands.SENDTOBOT, this.UserSays.bind(this))
      this.socket.on(Commands.STOP_CONTAINER, this.Stop.bind(this))
      this.socket.on(Commands.CLEAN_CONTAINER, this.Clean.bind(this))
      this.socket.on('disconnect', this.Clean.bind(this))
      this.socket.on('error', this.Clean.bind(this))
    }
  }

  Build (caps = {}, sources = {}, env = {}) {
    debug(`Build ${JSON.stringify(caps)}, ${JSON.stringify(sources)}, ${JSON.stringify(env)}`)

    return new Promise((resolve, reject) => {
      if (this.driver || this.container) {
        if (this.socket) {
          this.socket.emit(Events.CONTAINER_BUILD_ERROR, 'build already called')
        }
        return reject(new Error('build already called'))
      }
      delete caps[Capabilities.BOTIUMGRIDURL]
      caps[Capabilities.BOTIUMGRIDSLOT] = this.args.slot

      this.driver = new BotDriver(caps, sources, env)
      if (this.socket) {
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
      }

      this.driver.Build()
        .then((container) => {
          debug('Build succeded')
          this.container = container
          resolve()
        })
        .catch((err) => {
          this.driver = null
          this.container = null
          debug(`Build failed ${util.inspect(err)}`)
          reject(err)
        })
    })
  }

  Start () {
    debug('Start')

    return new Promise((resolve, reject) => {
      if (!this.container) {
        if (this.socket) {
          this.socket.emit(Events.CONTAINER_START_ERROR, 'container not built')
        }
        return reject(new Error('container not built'))
      }
      this.container.Start()
        .then(() => {
          debug('Start succeded')
          resolve()
        })
        .catch((err) => {
          debug(`Start failed ${util.inspect(err)}`)
          reject(err)
        })
    })
  }

  RunScript (script) {
    debug('RunScript')

    return new Promise((resolve, reject) => {
      if (!this.container) {
        if (this.socket) {
          this.socket.emit(Events.CONTAINER_START_ERROR, 'container not built')
        }
        return reject(new Error('container not built'))
      }
      const compiler = this.driver.BuildCompiler()
      compiler.Compile(script, ScriptingConstants.SCRIPTING_FORMAT_TXT, ScriptingConstants.SCRIPTING_TYPE_CONVO)
      async.eachSeries(compiler.convos, (convo, convoDone) => {
        convo.Run(this.container).then(() => convoDone()).catch(convoDone)
      },
      (err) => {
        if (err) return reject(err)
        else resolve()
      })
    })
  }

  UserSays (msg) {
    debug(`UserSays ${util.inspect(msg)}`)

    return new Promise((resolve, reject) => {
      if (!this.container) {
        if (this.socket) {
          this.socket.emit(Events.MESSAGE_SENDTOBOT_ERROR, 'container not built')
        }
        return reject(new Error('container not built'))
      }
      this.container.UserSays(msg)
        .then(() => {
          debug('UserSays succeded')
          resolve()
        })
        .catch((err) => {
          debug(`UserSays failed ${util.inspect(err)}`)
          reject(err)
        })
    })
  }

  WaitBotSays (channel, timeoutMillis) {
    debug(`BotSays ${channel} ${timeoutMillis}`)

    return new Promise((resolve, reject) => {
      if (!this.container) {
        return reject(new Error('container not built'))
      }
      this.container.WaitBotSays(channel, timeoutMillis)
        .then((botMsg) => {
          debug('WaitBotSays succeded')
          resolve(botMsg)
        })
        .catch((err) => {
          debug(`WaitBotSays failed ${util.inspect(err)}`)
          reject(err)
        })
    })
  }

  Stop () {
    debug('Stop')

    return new Promise((resolve, reject) => {
      if (!this.container) {
        if (this.socket) {
          this.socket.emit(Events.CONTAINER_STOP_ERROR, 'container not built')
        }
        return reject(new Error('container not built'))
      }
      this.container.Stop()
        .then(() => {
          debug('Stop succeded')
          resolve()
        })
        .catch((err) => {
          debug(`Stop failed ${util.inspect(err)}`)
          reject(err)
        })
    })
  }

  Clean () {
    debug('Clean')

    if (!this.container) return Promise.resolve()

    return new Promise((resolve, reject) => {
      this.container.Clean()
        .then(() => {
          this.container = null
          this.driver = null
          debug('Clean success')
          resolve()
        })
        .catch((err) => {
          this.container = null
          this.driver = null
          debug(`Clean failed ${util.inspect(err)}`)
          reject(err)
        })
    })
  }
}
