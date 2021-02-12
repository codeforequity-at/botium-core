const util = require('util')
const fs = require('fs')
const path = require('path')
const async = require('async')
const rimraf = require('rimraf')
const mkdirp = require('mkdirp')
const sanitize = require('sanitize-filename')
const moment = require('moment')
const randomize = require('randomatic')
const _ = require('lodash')
const { boolean } = require('boolean')
const EventEmitter = require('events')
const debug = require('debug')('botium-core-BotDriver')

const { version } = require('../package.json')

const Defaults = require('./Defaults')
const Capabilities = require('./Capabilities')
const Source = require('./Source')
const Fluent = require('./Fluent')
const Events = require('./Events')
const ScriptingProvider = require('./scripting/ScriptingProvider')

module.exports = class BotDriver {
  constructor (caps = {}, sources = {}, envs = {}) {
    this.eventEmitter = new EventEmitter()

    this.caps = _.cloneDeep(Defaults.Capabilities)
    this.sources = _.cloneDeep(Defaults.Sources)
    this.envs = _.cloneDeep(Defaults.Envs)

    this._fetchedConfigFiles = []
    this._fetchConfigFromFiles([
      './botium.json', process.env.NODE_ENV && `./botium.${process.env.NODE_ENV}.json`,
      './botium.local.json', process.env.NODE_ENV && `./botium.${process.env.NODE_ENV}.local.json`])

    const botiumConfigEnv = process.env.BOTIUM_CONFIG
    if (botiumConfigEnv) {
      const checkDir = path.dirname(botiumConfigEnv)
      const checkFileBase = path.basename(botiumConfigEnv, '.json')
      if (!this._fetchConfigFromFiles([
        botiumConfigEnv, process.env.NODE_ENV && path.join(checkDir, `${checkFileBase}.${process.env.NODE_ENV}.json`),
        path.join(checkDir, `${checkFileBase}.local.json`), process.env.NODE_ENV && path.join(checkDir, `${checkFileBase}.${process.env.NODE_ENV}.local.json`)
      ])) {
        throw new Error(`FAILED: Botium configuration file ${botiumConfigEnv} not available`)
      }
    }
    debug(`Loaded Botium configuration files ${this._fetchedConfigFiles.join(',')}`)

    const sourcesToTest = Object.keys(Source)

    Object.keys(process.env).filter(e => e.startsWith('BOTIUM_')).forEach((element) => {
      const elementToTest = element.replace(/^BOTIUM_/, '')
      if (sourcesToTest.includes(elementToTest)) {
        this._mergeCaps(this.sources, { [elementToTest]: process.env[element] })
      } else {
        this._mergeCaps(this.caps, { [elementToTest]: process.env[element] })
      }
      if (element.startsWith('BOTIUM_ENV_')) {
        const envName = element.replace(/^BOTIUM_ENV_/, '')
        this.envs[envName] = process.env[element]
      }
    })

    if (caps) this._mergeCaps(this.caps, caps)
    if (sources) this._mergeCaps(this.sources, sources)
    if (envs) this.envs = _.merge(this.envs, envs)
  }

  on (event, listener) {
    this.eventEmitter.on(event, listener)
    return this
  }

  setCapabilities (caps) {
    this._mergeCaps(this.caps, caps)
    return this
  }

  setCapability (cap, value) {
    this._mergeCaps(this.caps, { [cap]: value })
    return this
  }

  setSources (sources) {
    this._mergeCaps(this.sources, sources)
    return this
  }

  setSource (source, value) {
    this._mergeCaps(this.sources, { [source]: value })
    return this
  }

  setEnvs (envs) {
    this.envs = _.merge(this.envs, envs)
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
    debug(`Build - Botium Core Version: ${version}`)
    debug(`Build - Capabilites: ${util.inspect(this.caps)}`)
    debug(`Build - Sources : ${util.inspect(this.sources)}`)
    debug(`Build - Envs : ${util.inspect(this.envs)}`)
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
          if (this.tempDirectory) {
            rimraf(this.tempDirectory, (err) => {
              if (err) debug(`Cleanup temp dir ${this.tempDirectory} failed: ${util.inspect(err)}`)
            })
          }
          return reject(err)
        }
        this.eventEmitter.emit(Events.CONTAINER_BUILT, container)
        resolve(container)
      })
    })
  }

  BuildCompiler () {
    try {
      const compiler = new ScriptingProvider(this.caps)
      compiler.Build()
      return compiler
    } catch (err) {
      debug(`BotDriver BuildCompiler error: ${err}`)
      throw err
    }
  }

  /* Private Functions */

  // loadConfig from files
  _loadConfigFile (filename) {
    try {
      const configJson = JSON.parse(fs.readFileSync(filename))
      if (configJson.botium) {
        if (configJson.botium.Capabilities) this._mergeCaps(this.caps, configJson.botium.Capabilities)
        if (configJson.botium.Sources) this._mergeCaps(this.sources, configJson.botium.Sources)
        if (configJson.botium.Envs) this._mergeCaps(this.envs, configJson.botium.Envs)
        return true
      } else {
        debug(`Botium configuration file ${filename} contains no botium configuration. Ignored.`)
        return false
      }
    } catch (err) {
      throw new Error(`FAILED: loading Botium configuration file ${filename}: ${util.inspect(err)}`)
    }
  }

  // fetches config from files ordered by priority later files overwrite previous
  _fetchConfigFromFiles (files) {
    const fetchedFiles = []
    for (const file of files) {
      if (file && fs.existsSync(file)) {
        const absFilePath = path.resolve(file)
        if (this._fetchedConfigFiles.indexOf(absFilePath) < 0) {
          this._loadConfigFile(file)
          fetchedFiles.push(file)
          this._fetchedConfigFiles.push(absFilePath)
        } else {
          fetchedFiles.push(file)
        }
      }
    }
    return fetchedFiles
  }

  _findKeyProperty (obj) {
    const lookup = ['id', 'ID', 'Id', 'ref', 'REF', 'Ref', 'name', 'NAME', 'Name']
    for (const checkPropIdx in lookup) {
      if (Object.prototype.hasOwnProperty.call(obj, lookup[checkPropIdx])) return lookup[checkPropIdx]
    }
  }

  _mergeCaps (caps, newCaps) {
    if (!caps) return
    Object.keys(newCaps).forEach(capKey => {
      if (!Object.prototype.hasOwnProperty.call(caps, capKey)) {
        if (_.isString(newCaps[capKey])) {
          try {
            caps[capKey] = JSON.parse(newCaps[capKey])
            if (_.isFinite(caps[capKey])) {
              caps[capKey] = caps[capKey].toString()
            }
          } catch (err) {
            caps[capKey] = newCaps[capKey]
          }
        } else {
          caps[capKey] = newCaps[capKey]
        }
        return
      }

      if (_.isArray(caps[capKey])) {
        let newCapArray = newCaps[capKey]
        if (!_.isArray(newCapArray)) {
          try {
            newCapArray = JSON.parse(newCapArray)
          } catch (err) {
            debug(`Expected JSON Array in capability ${capKey}, JSON parse failed (${err}). Capability will be overwritten with maybe unexpected side effects.`)
          }
        }
        if (_.isArray(newCapArray)) {
          newCapArray.forEach(capElement => {
            const mergeKey = this._findKeyProperty(capElement)
            if (mergeKey) {
              const oldElement = caps[capKey].find(oldElement => oldElement[mergeKey] && oldElement[mergeKey] === capElement[mergeKey])
              if (oldElement) {
                _.merge(oldElement, capElement)
                return
              }
              caps[capKey].push(capElement)
            } else {
              if (caps[capKey].indexOf(capElement) < 0) {
                caps[capKey].push(capElement)
              }
            }
          })
          return
        }
      }
      if (!_.isArray(caps[capKey]) && _.isObject(caps[capKey])) {
        let newCapObject = newCaps[capKey]
        if (!_.isObject(newCapObject)) {
          try {
            newCapObject = JSON.parse(newCapObject)
          } catch (err) {
            debug(`Expected JSON Object in capability ${capKey}, JSON parse failed (${err}). Capability will be overwritten with maybe unexpected side effects.`)
          }
        }
        if (_.isObject(newCapObject)) {
          _.merge(caps[capKey], newCapObject)
          return
        }
      }

      if (_.isBoolean(caps[capKey])) {
        if (!_.isBoolean(newCaps[capKey])) {
          caps[capKey] = boolean(newCaps[capKey])
          return
        }
      }

      caps[capKey] = newCaps[capKey]
    })
  }

  _validate () {
    return new Promise((resolve, reject) => {
      try {
        if (!this.caps[Capabilities.PROJECTNAME]) {
          throw new Error(`Capability property ${Capabilities.PROJECTNAME} not set`)
        }
        if (!this.caps[Capabilities.TEMPDIR]) {
          throw new Error(`Capability property ${Capabilities.TEMPDIR} not set`)
        }
        if (!this.caps[Capabilities.CONTAINERMODE] && !this.caps[Capabilities.BOTIUMGRIDURL]) {
          throw new Error(`Capability '${Capabilities.CONTAINERMODE}' or '${Capabilities.BOTIUMGRIDURL}' missing`)
        }

        this.tempDirectory = path.resolve(process.cwd(), this.caps[Capabilities.TEMPDIR], sanitize(`${this.caps[Capabilities.PROJECTNAME]} ${moment().format('YYYYMMDD HHmmss')} ${randomize('Aa0', 5)}`))
        try {
          mkdirp.sync(this.tempDirectory)
        } catch (err) {
          throw new Error(`Unable to create temp directory ${this.tempDirectory}: ${err}`)
        }
        resolve(this)
      } catch (err) {
        reject(err)
      }
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
    if (!this.caps[Capabilities.CONTAINERMODE]) {
      throw new Error(`Capability '${Capabilities.CONTAINERMODE}' missing`)
    }
    if (this.caps[Capabilities.CONTAINERMODE] === 'inprocess') {
      const InProcessContainer = require('./containers/InProcessContainer')
      return new InProcessContainer(this.eventEmitter, this.tempDirectory, repo, this.caps, this.envs)
    }
    const PluginConnectorContainer = require('./containers/PluginConnectorContainer')
    return new PluginConnectorContainer(this.eventEmitter, this.tempDirectory, repo, this.caps, this.envs)
  }
}
