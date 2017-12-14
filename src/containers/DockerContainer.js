const fs = require('fs')
const util = require('util')
const async = require('async')
const path = require('path')
const mkdirp = require('mkdirp')
const yaml = require('write-yaml')
const uuid = require('uuid/v4')
const mustache = require('mustache')
const tcpPortUsed = require('tcp-port-used')
const request = require('request')
const io = require('socket.io-client')
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
      this._AssertCapabilityExists(Capabilities.DOCKERCOMPOSEPATH)
      this._AssertCapabilityExists(Capabilities.STARTCMD)
      this._AssertCapabilityExists(Capabilities.DOCKERIMAGE)
      this._AssertCapabilityExists(Capabilities.DOCKERTEMP)

      if (this.caps[Capabilities.FACEBOOK_API]) {
        this._AssertCapabilityExists(Capabilities.FACEBOOK_WEBHOOK_PORT)
        this._AssertCapabilityExists(Capabilities.FACEBOOK_WEBHOOK_PATH)
        this._AssertCapabilityExists(Capabilities.FACEBOOK_PUBLISHPORT)
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
      this.dockerConfig = {
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
                debug(data)
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
          this.dockerConfig.composefiles.push(dockercomposeMain)
          dockercomposeMainUsed()
        },

        (dockercomposeFacebookUsed) => {
          if (this.caps[Capabilities.FACEBOOK_API]) {
            const dockercomposeFacebook = path.resolve(__dirname, '..', 'mocks', 'facebook', 'docker-compose.fbmock.yml')
            this.dockerConfig.composefiles.push(dockercomposeFacebook)
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
                },
                volumes: [
                  `${this.repo.workingDirectory}:/usr/src/app`
                ]
              }
            }
          }
          if (this.caps[Capabilities.FACEBOOK_API]) {
            composeEnv.services['botium-fbmock'] = {
              build: {
                context: path.resolve(__dirname, '..', 'mocks', 'facebook')
              },
              volumes: [
                `${path.resolve(__dirname, '..', '..')}:/usr/src/app`
              ],
              ports: [
                `${this.caps[Capabilities.FACEBOOK_PUBLISHPORT]}:${this.caps[Capabilities.FACEBOOK_PUBLISHPORT]}`
              ],
              environment: {
                BOTIUM_FACEBOOK_WEBHOOKPORT: this.caps[Capabilities.FACEBOOK_WEBHOOK_PORT],
                BOTIUM_FACEBOOK_WEBHOOKPATH: this.caps[Capabilities.FACEBOOK_WEBHOOK_PATH],
                BOTIUM_FACEBOOK_PUBLISHPORT: this.caps[Capabilities.FACEBOOK_PUBLISHPORT]
              }
            }
          }
          this.dockercomposeEnvFile = path.resolve(this.tempDirectory, `${uuid()}.yml`)

          debug(`Writing docker compose environment to ${this.dockercomposeEnvFile} - ${JSON.stringify(composeEnv)}`)
          yaml(this.dockercomposeEnvFile, composeEnv, (err) => {
            if (err) return dockercomposeEnvUsed(`Writing docker file ${this.dockercomposeEnvFile} failed: ${err}`)
            this.dockerConfig.composefiles.push(this.dockercomposeEnvFile)
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
              this.dockerConfig.composefiles.push(dockercomposeOverride)
            }
            dockercomposeOverrideUsed()
          })
        },

        (dockerReady) => {
          debug(this.dockerConfig)
          this.dockerCmd = new DockerCmd(this.dockerConfig)
          this.dockerCmd.setupContainer()
            .then(() => {
              dockerReady()
            })
            .catch((err) => {
              dockerReady(`Cannot build docker containers: ${util.inspect(err)}`)
            })
        }

      ], (err) => {
        if (err) {
          return reject(new Error(`Cannot build docker containers: ${util.inspect(err)}`))
        }
        resolve()
      })
    })
  }

  Start () {
    return new Promise((resolve, reject) => {
      async.series([

        (dockerStarted) => {
          if (this.dockerCmd) {
            this.dockerCmd.startContainer()
              .then(() => {
                dockerStarted()
              })
              .catch((err) => {
                debug(`Cannot start docker containers: ${util.inspect(err)}`)
                dockerStarted()
              })
          } else {
            dockerStarted(`not built`)
          }
        },

        (facebookMockupOnline) => {
          if (this.caps[Capabilities.FACEBOOK_API]) {
            const portToCheck = this.caps[Capabilities.FACEBOOK_PUBLISHPORT]
            let online = false
            async.until(
              () => online,
              (callback) => {
                debug(`Facebook Mock - checking port usage ${portToCheck} before proceed`)

                tcpPortUsed.check(portToCheck, '127.0.0.1')
                  .then((inUse) => {
                    debug(`Facebook Mock - port usage (${portToCheck}): ${inUse}`)
                    if (inUse) {
                      online = true
                      callback()
                    } else {
                      setTimeout(callback, 2000)
                    }
                  }, (err) => {
                    debug(`Facebook Mock - error on port check: ${err}`)
                    setTimeout(callback, 2000)
                  })
              },
              facebookMockupOnline
            )
          } else {
            facebookMockupOnline()
          }
        },

        (facebookEndpointOnline) => {
          if (this.caps[Capabilities.FACEBOOK_API]) {
            this.facebookMockUrl = `http://127.0.0.1:${this.caps[Capabilities.FACEBOOK_PUBLISHPORT]}`
            let online = false
            async.until(
              () => online,
              (callback) => {
                var options = {
                  uri: this.facebookMockUrl,
                  method: 'GET'
                }
                debug(`Facebook Mock - checking endpoint ${this.facebookMockUrl} before proceed`)
                request(options, (err, response, body) => {
                  if (err) {
                    setTimeout(callback, 2000)
                  } else if (response && response.statusCode === 200) {
                    debug(`Facebook Mock - endpoint ${this.facebookMockUrl} is online`)
                    online = true
                    callback()
                  } else {
                    setTimeout(callback, 2000)
                  }
                })
              },
              facebookEndpointOnline
            )
          } else {
            facebookEndpointOnline()
          }
        },

        (facebookSocketStartDone) => {
          if (this.caps[Capabilities.FACEBOOK_API]) {
            if (this.socket) {
              this.socket.disconnect()
              this.socket = null
            }

            this.socket = io.connect(this.facebookMockUrl)
            this.socket.on('botsays', (saysContent) => {
              debug('Facebook Mock - socket received botsays event ' + JSON.stringify(saysContent))
            })
            this.socket.on('error', (err) => {
              debug('Facebook Mock - socket connection error! ' + err)
            })
            this.socket.on('connect', () => {
              debug('Facebook Mock - socket connected')
              facebookSocketStartDone()
            })
          } else {
            facebookSocketStartDone()
          }
        }

      ], (err) => {
        if (err) {
          return reject(new Error(`Start failed ${util.inspect(err)}`))
        }
        resolve(this)
      })
    })
  }

  Stop () {
    return new Promise((resolve, reject) => {
      async.series([

        (socketStopDone) => {
          if (this.socket) {
            this.socket.disconnect()
            this.socket = null
          }
          socketStopDone()
        },

        (dockerStopped) => {
          if (this.dockerCmd) {
            this.dockerCmd.stopContainer()
              .then(() => {
                dockerStopped()
              })
              .catch((err) => {
                debug(`Cannot stop docker containers: ${util.inspect(err)}`)
                dockerStopped()
              })
          } else {
            dockerStopped(`not built`)
          }
        }

      ], (err) => {
        if (err) {
          return reject(new Error(`Stop failed ${util.inspect(err)}`))
        }
        resolve(this)
      })
    })
  }

  Clean () {
    return new Promise((resolve, reject) => {
      async.series([

        (dockerStopped) => {
          if (this.dockerCmd) {
            this.dockerCmd.teardownContainer()
              .then(() => {
                dockerStopped()
              })
              .catch((err) => {
                debug(`Cannot stop docker containers: ${util.inspect(err)}`)
                dockerStopped()
              })
          } else {
            dockerStopped()
          }
        },

        (cleanupTasksDone) => {
          if (this.cleanupTasks) {
            async.series(
              this.cleanupTasks.map((task) => {
                return (cb) => {
                  task((err) => {
                    if (err) debug(`Cleanup failed: ${util.inspect(err)}`)
                    cb()
                  })
                }
              }),
              () => {
                cleanupTasksDone()
              }
            )
          } else {
            cleanupTasksDone()
          }
        }

      ], (err) => {
        if (err) {
          return reject(new Error(`Cleanup failed ${util.inspect(err)}`))
        }
        resolve()
      })
    })
  }
}
