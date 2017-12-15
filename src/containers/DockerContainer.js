const fs = require('fs')
const util = require('util')
const async = require('async')
const path = require('path')
const yaml = require('write-yaml')
const mustache = require('mustache')
const request = require('request')
const io = require('socket.io-client')
const SyslogServer = require('syslog-server')
const debug = require('debug')('DockerContainer')
const debugContainerOutput = require('debug')('DockerContainerOutput')

const Capabilities = require('../Capabilities')
const BaseContainer = require('./BaseContainer')
const DockerCmd = require('./DockerCmd')
const BotiumMockMessage = require('../mocks/BotiumMockMessage')
const BotiumMockCommand = require('../mocks/BotiumMockCommand')
const TcpPortUtils = require('../helpers/TcpPortUtils')

module.exports = class DockerContainer extends BaseContainer {
  Validate () {
    return super.Validate().then(() => {
      this._AssertCapabilityExists(Capabilities.DOCKERCOMPOSEPATH)
      this._AssertCapabilityExists(Capabilities.STARTCMD)
      this._AssertCapabilityExists(Capabilities.DOCKERIMAGE)

      if (this.caps[Capabilities.FACEBOOK_API]) {
        this._AssertCapabilityExists(Capabilities.FACEBOOK_WEBHOOK_PORT)
        this._AssertCapabilityExists(Capabilities.FACEBOOK_WEBHOOK_PATH)
        this._AssertCapabilityExists(Capabilities.FACEBOOK_PUBLISHPORT_RANGE)
      }
    })
  }

  Build () {
    return new Promise((resolve, reject) => {
      this.dockerConfig = {
        projectname: this.caps[Capabilities.PROJECTNAME],
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

        (syslogPortSelected) => {
          TcpPortUtils.GetFreePortInRange('127.0.0.1', this.caps[Capabilities.DOCKERSYSLOGPORT_RANGE])
            .then((syslogPort) => {
              this.syslogPort = syslogPort
              syslogPortSelected()
            })
            .catch(syslogPortSelected)
        },

        (facebookPortSelected) => {
          if (this.caps[Capabilities.FACEBOOK_API]) {
            TcpPortUtils.GetFreePortInRange('127.0.0.1', this.caps[Capabilities.FACEBOOK_PUBLISHPORT_RANGE])
              .then((fbPort) => {
                this.facebookPublishPort = fbPort
                facebookPortSelected()
              })
              .catch(facebookPortSelected)
          } else {
            facebookPortSelected()
          }
        },

        (dockercomposeEnvUsed) => {
          const composeEnv = {
            version: '2',
            services: {
              botium: {
                build: {
                  context: this.repo.workingDirectory
                },
                logging: {
                  driver: 'syslog',
                  options: {
                    'syslog-address': `udp://127.0.0.1:${this.syslogPort}`
                  }
                },
                volumes: [
                  `${this.repo.workingDirectory}:/usr/src/app`
                ]
              }
            }
          }
          if (this.envs) {
            composeEnv.services.botium.environment = this.envs
          }
          if (this.caps[Capabilities.FACEBOOK_API]) {
            composeEnv.services['botium-fbmock'] = {
              build: {
                context: path.resolve(__dirname, '..', 'mocks', 'facebook')
              },
              logging: {
                driver: 'syslog',
                options: {
                  'syslog-address': `udp://127.0.0.1:${this.syslogPort}`
                }
              },
              volumes: [
                `${path.resolve(__dirname, '..', '..')}:/usr/src/app`
              ],
              ports: [
                `${this.facebookPublishPort}:${this.facebookPublishPort}`
              ],
              environment: {
                BOTIUM_FACEBOOK_WEBHOOKPORT: this.caps[Capabilities.FACEBOOK_WEBHOOK_PORT],
                BOTIUM_FACEBOOK_WEBHOOKPATH: this.caps[Capabilities.FACEBOOK_WEBHOOK_PATH],
                BOTIUM_FACEBOOK_PUBLISHPORT: this.facebookPublishPort
              }
            }
          }
          this.dockercomposeEnvFile = path.resolve(this.tempDirectory, `docker-env.yml`)

          debug(`Writing docker compose environment to ${this.dockercomposeEnvFile} - ${JSON.stringify(composeEnv)}`)
          yaml(this.dockercomposeEnvFile, composeEnv, (err) => {
            if (err) return dockercomposeEnvUsed(`Writing docker file ${this.dockercomposeEnvFile} failed: ${err}`)
            this.dockerConfig.composefiles.push(this.dockercomposeEnvFile)
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
        resolve(this)
      })
    })
  }

  Start () {
    return new Promise((resolve, reject) => {
      async.series([

        (syslogStarted) => {
          this.syslogFile = path.resolve(this.tempDirectory, 'docker-containers-log.txt')

          this.syslogServer = new SyslogServer()
          this.syslogServer.on('message', (value) => {
            debugContainerOutput(value.message)
            fs.appendFile(this.syslogFile, value.message, () => { })
          })
          this.syslogServer.on('error', (err) => {
            debug(`Error from syslog server: ${util.inspect(err)}`)
          })
          this.syslogServer.start({ port: this.syslogPort })
            .then(() => syslogStarted())
            .catch((err) => {
              syslogStarted(`Cannot start syslog server: ${util.inspect(err)}`)
            })
        },

        (dockerStarted) => {
          if (!this.dockerCmd) return dockerStarted('not built')

          this.dockerCmd.startContainer()
            .then(() => dockerStarted())
            .catch((err) => {
              dockerStarted(`Cannot start docker containers: ${util.inspect(err)}`)
            })
        },

        (facebookMockupOnline) => {
          if (this.caps[Capabilities.FACEBOOK_API]) {
            TcpPortUtils.WaitForPort('127.0.0.1', this.facebookPublishPort)
              .then(() => facebookMockupOnline())
              .catch(facebookMockupOnline)
          } else {
            facebookMockupOnline()
          }
        },

        (facebookEndpointOnline) => {
          if (this.caps[Capabilities.FACEBOOK_API]) {
            this.facebookMockUrl = `http://127.0.0.1:${this.facebookPublishPort}`
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
            this.socket.on(BotiumMockCommand.MOCKCMD_RECEIVEDFROMBOT, (botMsg) => {
              debug(`Facebook Mock - socket received from bot ${util.inspect(botMsg)}`)
              this._QueueBotSays(new BotiumMockMessage(botMsg))
            })
            this.socket.on('error', (err) => {
              debug(`Facebook Mock - socket connection error! ${util.inspect(err)}`)
            })
            this.socket.on('connect', () => {
              debug(`Facebook Mock - socket connected ${this.facebookMockUrl}`)
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

  UserSaysText (text) {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.socket.emit(BotiumMockCommand.MOCKCMD_SENDTOBOT, new BotiumMockMessage({ sender: 'me', messageText: text }))
        resolve(this)
      } else {
        reject(new Error('Socket not online'))
      }
    })
  }

  UserSays (mockMsg) {
    return new Promise((resolve, reject) => {
      if (this.socket) {
        this.socket.emit(BotiumMockCommand.MOCKCMD_SENDTOBOT, mockMsg)
        resolve(this)
      } else {
        reject(new Error('Socket not online'))
      }
    })
  }

  Stop () {
    return new Promise((resolve, reject) => {
      async.series([

        (socketStopDone) => {
          if (this.socket) {
            this.socket.disconnect()
            this.socket = null
            debug('Facebook Mock - socket disconnected')
          }
          socketStopDone()
        },

        (dockerStopped) => {
          if (!this.dockerCmd) return dockerStopped()

          this.dockerCmd.stopContainer()
            .then(() => {
              dockerStopped()
            })
            .catch((err) => {
              dockerStopped(`Cannot stop docker containers: ${util.inspect(err)}`)
            })
        },

        (syslogStopped) => {
          if (!this.syslogServer) return syslogStopped()

          this.syslogServer.stop()
            .then(syslogStopped)
            .catch((err) => {
              syslogStopped(`Cannot stop syslog server: ${util.inspect(err)}`)
            })
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
                debug(`Cannot teardown docker containers: ${util.inspect(err)}`)
                dockerStopped()
              })
          } else {
            dockerStopped()
          }
        },

        (cleanupTasksDone) => {
          super.Clean().then(cleanupTasksDone).catch(() => cleanupTasksDone())
        }

      ], (err) => {
        if (err) {
          return reject(new Error(`Cleanup failed ${util.inspect(err)}`))
        }
        resolve(this)
      })
    })
  }
}
