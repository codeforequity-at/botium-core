const util = require('util')
const path = require('path')
const async = require('async')
const mkdirp = require('mkdirp')
const slug = require('slug')
const moment = require('moment')
const randomize = require('randomatic')
const EventEmitter = require('events')
const debug = require('debug')('botium-BotDriver')

const Defaults = require('./Defaults')
const Capabilities = require('./Capabilities')
const Source = require('./Source')
const Fluent = require('./Fluent')
const Events = require('./Events')
const ScriptingProvider = require('./scripting/ScriptingProvider')

module.exports = class BotDriver {
  constructor (caps = {}, sources = {}, env = {}) {
    this.caps = Object.assign(Defaults.Capabilities, caps)
    this.sources = Object.assign(Defaults.Sources, sources)
    this.envs = Object.assign({}, env)
    this.eventEmitter = new EventEmitter()
  }

  on (event, listener) {
    this.eventEmitter.on(event, listener)
    return this
  }

  setCapabilities (caps) {
    this.caps = Object.assign(this.caps, caps)
    return this
  }

  setCapability (cap, value) {
    this.caps[cap] = value
    return this
  }

  setSources (sources) {
    this.sources = Object.assign(this.sources, sources)
    return this
  }

  setSource (source, value) {
    this.sources[source] = value
    return this
  }

  setEnvs (envs) {
    this.envs = Object.assign(this.envs, envs)
    return this
  }

  setEnv (name, value) {
    this.envs[name] = value
    return this
  }

  BuildFluent () {
    this.Fluent = new Fluent(this)
    return this.Fluent
  }

  Build () {
    debug(`Build - Sources : ${util.inspect(this.sources)} Capabilites: ${util.inspect(this.caps)}`)
    this.eventEmitter.emit(Events.CONTAINER_BUILDING)

    return new Promise((resolve, reject) => {
      let repo = null
      let container = null

      async.series([

        (driverValidated) => {
          this._validate()
            .then(() => driverValidated())
            .catch(driverValidated)
        },

        (repoValidated) => {
          try {
            repo = this._getRepo()
          } catch (err) {
            return repoValidated(err)
          }
          repo.Validate().then(() => repoValidated()).catch(repoValidated)
        },

        (repoPrepared) => {
          repo.Prepare().then(() => repoPrepared()).catch(repoPrepared)
        },

        (containerValidated) => {
          try {
            container = this._getContainer(repo)
          } catch (err) {
            return containerValidated(err)
          }
          container.Validate().then(() => containerValidated()).catch(containerValidated)
        },

        (containerBuilt) => {
          container.Build().then(() => containerBuilt()).catch(containerBuilt)
        }

      ], (err) => {
        if (err) {
          debug(`BotDriver Build error: ${err}`)
          this.eventEmitter.emit(Events.CONTAINER_BUILD_ERROR, err)
          return reject(err)
        }
        this.eventEmitter.emit(Events.CONTAINER_BUILT, container)
        resolve(container)
      })
    })
  }

  BuildCompiler () {
    debug(`BuildCompiler: Capabilites: ${util.inspect(this.caps)}`)
    try {
      let compiler = new ScriptingProvider(this.caps)
      compiler.Build()
      return compiler
    } catch (err) {
      debug(`BotDriver BuildCompiler error: ${err}`)
      throw err
    }
  }

  /* Private Functions */

  _validate () {
    return new Promise((resolve, reject) => {
      if (!this.caps[Capabilities.PROJECTNAME]) {
        throw new Error(`Capability property ${Capabilities.PROJECTNAME} not set`)
      }
      if (!this.caps[Capabilities.TEMPDIR]) {
        throw new Error(`Capability property ${Capabilities.TEMPDIR} not set`)
      }

      async.series([
        (tempdirCreated) => {
          this.tempDirectory = path.resolve(process.cwd(), this.caps[Capabilities.TEMPDIR], slug(`${this.caps[Capabilities.PROJECTNAME]} ${moment().format('YYYYMMDD HHmmss')} ${randomize('Aa0', 5)}`))

          mkdirp(this.tempDirectory, (err) => {
            if (err) {
              return tempdirCreated(new Error(`Unable to create temp directory ${this.tempDirectory}: ${err}`))
            }
            tempdirCreated()
          })
        }

      ], (err) => {
        if (err) {
          return reject(err)
        }
        resolve(this)
      })
    })
  }

  _getRepo () {
    if (this.caps[Capabilities.BOTIUMGRIDURL]) {
      const NoRepo = require('./repos/NoRepo')
      return new NoRepo(this.tempDirectory, this.sources)
    }
    if (this.sources[Source.GITURL]) {
      const GitRepo = require('./repos/GitRepo')
      return new GitRepo(this.tempDirectory, this.sources)
    }
    if (this.sources[Source.LOCALPATH]) {
      const LocalRepo = require('./repos/LocalRepo')
      return new LocalRepo(this.tempDirectory, this.sources)
    }
    throw new Error(`No Repo provider found for Sources ${util.inspect(this.sources)}`)
  }

  _getContainer (repo) {
    if (this.caps[Capabilities.BOTIUMGRIDURL]) {
      const GridContainer = require('./containers/GridContainer')
      return new GridContainer(this.eventEmitter, this.tempDirectory, repo, this.caps, this.envs)
    }
    if (this.caps[Capabilities.CONTAINERMODE] === 'docker') {
      const DockerContainer = require('./containers/DockerContainer')
      return new DockerContainer(this.eventEmitter, this.tempDirectory, repo, this.caps, this.envs)
    }
    if (this.caps[Capabilities.CONTAINERMODE] === 'fbdirect') {
      const FbContainer = require('./containers/FbContainer')
      return new FbContainer(this.eventEmitter, this.tempDirectory, repo, this.caps, this.envs)
    }
    if (this.caps[Capabilities.CONTAINERMODE] === 'watsonconversation') {
      const WatsonConversationContainer = require('./containers/WatsonConversationContainer')
      return new WatsonConversationContainer(this.eventEmitter, this.tempDirectory, repo, this.caps, this.envs)
    }
    if (this.caps[Capabilities.CONTAINERMODE] === 'dialogflow') {
      const DialogflowContainer = require('./containers/DialogflowContainer')
      return new DialogflowContainer(this.eventEmitter, this.tempDirectory, repo, this.caps, this.envs)
    }
    if (this.caps[Capabilities.CONTAINERMODE] === 'simplerest') {
      const SimpleRestContainer = require('./containers/SimpleRestContainer')
      return new SimpleRestContainer(this.eventEmitter, this.tempDirectory, repo, this.caps, this.envs)
    }
    if (this.caps[Capabilities.CONTAINERMODE] === 'webspeech') {
      const WebSpeechContainer = require('./containers/WebSpeechContainer')
      return new WebSpeechContainer(this.eventEmitter, this.tempDirectory, repo, this.caps, this.envs)
    }
    if (this.caps[Capabilities.CONTAINERMODE] === 'inprocess') {
      const InProcessContainer = require('./containers/InProcessContainer')
      return new InProcessContainer(this.eventEmitter, this.tempDirectory, repo, this.caps, this.envs)
    }
    throw new Error(`No Container provider1 found for Caps ${util.inspect(this.caps)}`)
  }
}
