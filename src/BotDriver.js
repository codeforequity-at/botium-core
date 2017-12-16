const util = require('util')
const path = require('path')
const async = require('async')
const mkdirp = require('mkdirp')
const slug = require('slug')
const moment = require('moment')
const randomize = require('randomatic')
const EventEmitter = require('events')
const debug = require('debug')('BotDriver')

const Capabilities = require('./Capabilities')
const Source = require('./Source')
const Fluent = require('./Fluent')
const Events = require('./Events')

module.exports = class BotDriver {
  constructor (caps = {}, sources = {}, env = {}) {
    const defaultCaps = {
      [Capabilities.PROJECTNAME]: 'defaultproject',
      [Capabilities.TEMPDIR]: 'botiumwork',
      [Capabilities.CLEANUPTEMPDIR]: true,
      [Capabilities.CONTAINERMODE]: 'docker',
      [Capabilities.DOCKERCOMPOSEPATH]: 'docker-compose',
      [Capabilities.DOCKERIMAGE]: 'node:boron',
      [Capabilities.DOCKERSYSLOGPORT_RANGE]: '47199-47499',
      [Capabilities.FACEBOOK_PUBLISHPORT_RANGE]: '46199-46499'
    }
    const defaultSources = {
      [Source.LOCALPATH]: '.',
      [Source.GITPATH]: 'git',
      [Source.GITBRANCH]: 'master',
      [Source.GITDIR]: '.'
    }
    this.caps = Object.assign(defaultCaps, caps)
    this.sources = Object.assign(defaultSources, sources)
    this.envs = {}
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
          repo = this._getRepo()
          debug(`Got Repo: ${util.inspect(repo)}`)
          repo.Validate().then(() => repoValidated()).catch(repoValidated)
        },

        (repoPrepared) => {
          repo.Prepare().then(() => repoPrepared()).catch(repoPrepared)
        },

        (containerValidated) => {
          container = this._getContainer(repo)
          debug(`Got Container: ${util.inspect(container)}`)
          container.Validate().then(() => containerValidated()).catch(containerValidated)
        },

        (containerBuilt) => {
          container.Build().then(() => containerBuilt()).catch(containerBuilt)
        }

      ], (err) => {
        if (err) {
          this.eventEmitter.emit(Events.CONTAINER_BUILD_ERROR, err)
          return reject(err)
        }
        this.eventEmitter.emit(Events.CONTAINER_BUILT, container)
        resolve(container)
      })
    })
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
    if (this.caps[Capabilities.CONTAINERMODE] === 'docker') {
      const DockerContainer = require('./containers/DockerContainer')
      return new DockerContainer(this.eventEmitter, this.tempDirectory, repo, this.caps, this.envs)
    }
    throw new Error(`No Container provider found for Caps ${util.inspect(this.caps)}`)
  }
}
