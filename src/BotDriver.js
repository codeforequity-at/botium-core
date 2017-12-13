const util = require('util')
const async = require('async')
const debug = require('debug')('BotDriver')

const Capabilities = require('./Capabilities')
const Source = require('./Source')

module.exports = class BotDriver {
  constructor (caps, sources) {
    const defaultCaps = {
      [Capabilities.CONTAINERMODE]: 'docker',
      [Capabilities.DOCKERCOMPOSEPATH]: 'docker-compose',
      [Capabilities.DOCKERIMAGE]: 'node:boron',
      [Capabilities.DOCKERTEMP]: './temp'
    }
    const defaultSources = {
      [Source.LOCALPATH]: '.',
      [Source.GITPATH]: 'git',
      [Source.GITTEMPPATH]: './botium-temp'
    }
    this.caps = Object.assign(defaultCaps, caps)
    this.sources = Object.assign(defaultSources, sources)
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

  Build () {
    debug(`Build - Sources : ${util.inspect(this.sources)} Capabilites: ${util.inspect(this.caps)}`)
    return new Promise((resolve, reject) => {
      let repo = null
      let container = null

      async.series([

        (repoValidated) => {
          repo = this._getRepo()
          debug(`Got Repo: ${util.inspect(repo)}`)
          repo.Validate().then(repoValidated).catch(repoValidated)
        },

        (repoPrepared) => {
          repo.Prepare().then(repoPrepared).catch(repoPrepared)
        },

        (containerValidated) => {
          container = this._getContainer(repo)
          debug(`Got Container: ${util.inspect(container)}`)
          container.Validate().then(containerValidated).catch(containerValidated)
        },

        (containerBuilt) => {
          container.Build().then(containerBuilt).catch(containerBuilt)
        }

      ], (err) => {
        if (err) {
          return reject(err)
        }
        resolve(container)
      })
    })
  }

  /* Private Functions */

  _getRepo () {
    if (this.sources[Source.GITURL]) {
      const GitRepo = require('./repos/GitRepo')
      return new GitRepo(this.sources)
    }
    if (this.sources[Source.LOCALPATH]) {
      const LocalRepo = require('./repos/LocalRepo')
      return new LocalRepo(this.sources)
    }
    throw new Error(`No Repo provider found for Sources ${util.inspect(this.sources)}`)
  }

  _getContainer (repo) {
    if (this.caps[Capabilities.CONTAINERMODE] === 'docker') {
      const DockerContainer = require('./containers/DockerContainer')
      return new DockerContainer(repo, this.caps)
    }
    throw new Error(`No Container provider found for Caps ${util.inspect(this.caps)}`)
  }
}
