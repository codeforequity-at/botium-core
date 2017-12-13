const fs = require('fs')
const util = require('util')
const async = require('async')
const path = require('path')
const mkdirp = require('mkdirp')
const yaml = require('write-yaml')
const uuid = require('uuid/v4');
const mustache = require('mustache')
const debug = require('debug')('DockerContainer')

const Capabilities = require('../Capabilities')
const BaseContainer = require('./BaseContainer')
const DockerCmd = require('./DockerCmd')

module.exports = class DockerContainer extends BaseContainer {
  constructor (repo, caps) {
    super(repo, caps)
    this.cleanupTasks = []
    this.tempDirectory = path.resolve(process.cwd(), this.caps[Capabilities.DOCKERTEMP])
    
  }

  Validate () {
    return new Promise((resolve, reject) => {
      if (!this.caps[Capabilities.DOCKERCOMPOSEPATH]) {
        return reject(new Error(`Capability property ${Capabilities.DOCKERCOMPOSEPATH} not set`))
      }
      if (!this.caps[Capabilities.STARTCMD]) {
        return reject(new Error(`Capability property ${Capabilities.STARTCMD} not set`))
      }
      if (!this.caps[Capabilities.DOCKERIMAGE]) {
        return reject(new Error(`Capability property ${Capabilities.DOCKERIMAGE} not set`))
      }
      if (!this.caps[Capabilities.DOCKERTEMP]) {
        return reject(new Error(`Capability property ${Capabilities.DOCKERTEMP} not set`))
      }
      if (this.caps[Capabilities.FACEBOOK_API]) {
        if (!this.caps[Capabilities.FACEBOOK_WEBHOOK_PORT]) {
          return reject(new Error(`Capability property ${Capabilities.FACEBOOK_WEBHOOK_PORT} not set`))
        }
        if (!this.caps[Capabilities.FACEBOOK_WEBHOOK_PATH]) {
          return reject(new Error(`Capability property ${Capabilities.FACEBOOK_WEBHOOK_PATH} not set`))
        }
      }

      async.series([
        (tempdirCreated) => {
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
        resolve()
      })
    })
  }

  Build () {
    return new Promise((resolve, reject) => {
      const dockerConfig = {
        dockercomposepath: this.caps[Capabilities.DOCKERCOMPOSEPATH],
        composefiles: []
      }

      async.series([

        (dockerfileCreated) => {
          const dockerfileBotium = path.resolve(this.repo.workingDirectory, 'Dockerfile.botium')
          fs.stat(dockerfileBotium, (err, stats) => {
            if (!err && stats.isFile()) {
              debug(`Dockerfile ${dockerfileBotium} already present, using it.`)
              dockerfileCreated()
            } else {
              const templateFile = path.resolve(__dirname, '..', 'Dockerfile.botium.template')
              fs.readFile(templateFile, 'utf8', (err, data) => {
                if (err) return dockerfileCreated(`Reading docker template file ${templateFile} failed: ${err}`)
                debug(data);
                const viewData = {
                  STARTCMD: this.caps[Capabilities.STARTCMD],
                  DOCKERIMAGE: this.caps[Capabilities.DOCKERIMAGE]
                }
                const convertedFile = mustache.render(data, viewData)
                fs.writeFile(dockerfileBotium, convertedFile, (err) => {
                  if (err) return dockerfileCreated(`Writing dockerfile ${dockerfileBotium} failed: ${err}`)

                  this.cleanupTasks.push((cb) => {
                    fs.unlink(dockerfileBotium, cb)
                  })
                  dockerfileCreated()
                })
              })
            }
          })
        },

        (dockercomposeMainUsed) => {
          const dockercomposeMain = path.resolve(__dirname, '..', 'docker-compose.botium.yml')
          dockerConfig.composefiles.push(dockercomposeMain)
          dockercomposeMainUsed()
        },

        (dockercomposeFacebookUsed) => {
          if (this.caps[Capabilities.FACEBOOK_API]) {
            const dockercomposeFacebook = path.resolve(__dirname, '..', 'mocks', 'facebook', 'docker-compose.fbmock.yml')
            dockerConfig.composefiles.push(dockercomposeFacebook)
          }
          dockercomposeFacebookUsed()
        },

        (dockercomposeEnvUsed) => {
          const composeEnv = {
            version: '2',
            services: {
              botium: {
                build: {
                  context: this.repo.workingDirectory
                }
              }
            }
          }
          if (this.caps[Capabilities.FACEBOOK_API]) {
            composeEnv.services['botium-fbmock'] = {
              build: {
                context: path.resolve(__dirname, '..', 'mocks', 'facebook')
              },
              environment: {
                BOTIUM_FACEBOOK_WEBHOOKPORT: this.caps[Capabilities.FACEBOOK_WEBHOOK_PORT],
                BOTIUM_FACEBOOK_WEBHOOKPATH: this.caps[Capabilities.FACEBOOK_WEBHOOK_PATH]
              }
            }
          }
          this.dockercomposeEnvFile = path.resolve(this.tempDirectory, `${uuid()}.yml`)
          
          debug(`Writing docker compose environment to ${this.dockercomposeEnvFile} - ${JSON.stringify(composeEnv)}`)
          yaml(this.dockercomposeEnvFile, composeEnv, (err) => {
            if (err) return dockercomposeEnvUsed(`Writing docker file ${this.dockercomposeEnvFile} failed: ${err}`)
            dockerConfig.composefiles.push(this.dockercomposeEnvFile)
            this.cleanupTasks.push((cb) => {
              fs.unlink(this.dockercomposeEnvFile, cb)
            })          
            dockercomposeEnvUsed()
          })
        },

        (dockercomposeOverrideUsed) => {
          const dockercomposeOverride = path.resolve(this.repo.workingDirectory, 'docker-compose.botium.override.yml')
          fs.stat(dockercomposeOverride, (err, stats) => {
            if (!err && stats.isFile()) {
              debug(`Docker-Compose file ${dockercomposeOverride} present, using it.`)
              dockerConfig.composefiles.push(dockercomposeOverride)
            }
            dockercomposeOverrideUsed()
          })
        },

        (dockerReady) => {
          debug(dockerConfig)
          this.dockerCmd = new DockerCmd(dockerConfig)
          this.dockerCmd.setupContainer()
            .then(() => {
              dockerReady()
            })
            .catch((err) => {
              dockerReady(new Error(`Cannot build docker containers: ${util.inspect(err)}`))
            })
        }

      ], (err) => {
        if (err) {
          return reject(new Error(`Cannot build docker containers: ${util.inspect(err)}`))
        }
        resolve()
      })

      /*
      dockerConfig.composefiles.push(path.resolve(this.repo.workingDirectory, 'docker-compose.botium.yml'))
      dockerConfig.composefiles.push(path.resolve(__dirname, '../mocks/facebook/docker-compose.fbmock.yml'))
      dockerConfig.composefiles.push(path.resolve(this.repo.workingDirectory, 'docker-compose.botium.override.yml'))
      */
    })
  }
}
