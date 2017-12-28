const fs = require('fs')
const util = require('util')
const async = require('async')
const path = require('path')
const yaml = require('write-yaml')
const mustache = require('mustache')
const findRoot = require('find-root')
const debug = require('debug')('botium-DockerContainer')
const debugContainerOutput = require('debug')('botium-DockerContainerOutput')

const Capabilities = require('../Capabilities')
const Events = require('../Events')
const BaseContainer = require('./BaseContainer')
const DockerCmd = require('./DockerCmd')
const DockerMocks = require('./DockerMocks')
const BotiumMockCommand = require('../mocks/BotiumMockCommand')
const TcpPortUtils = require('../helpers/TcpPortUtils')
const SyslogServer = require('../helpers/SyslogServer')

const botiumPackageRootDir = findRoot()

module.exports = class DockerContainer extends BaseContainer {
  Validate () {
    return super.Validate().then(() => {
      this._AssertCapabilityExists(Capabilities.DOCKERCOMPOSEPATH)
      this._AssertCapabilityExists(Capabilities.STARTCMD)
      this._AssertCapabilityExists(Capabilities.DOCKERIMAGE)
      this._AssertOneCapabilityExists(Capabilities.DOCKERSYSLOGPORT, Capabilities.DOCKERSYSLOGPORT_RANGE)

      if (this.caps[Capabilities.FACEBOOK_API]) {
        this._AssertCapabilityExists(Capabilities.FACEBOOK_WEBHOOK_PORT)
        this._AssertCapabilityExists(Capabilities.FACEBOOK_WEBHOOK_PATH)
        this._AssertOneCapabilityExists(Capabilities.FACEBOOK_PUBLISHPORT, Capabilities.FACEBOOK_PUBLISHPORT_RANGE)
      }
      if (this.caps[Capabilities.SLACK_API]) {
        this._AssertCapabilityExists(Capabilities.SLACK_WEBHOOK_PORT)
        this._AssertCapabilityExists(Capabilities.SLACK_WEBHOOK_EVENTPATH)
        this._AssertCapabilityExists(Capabilities.SLACK_WEBHOOK_OAUTHPATH)
        this._AssertOneCapabilityExists(Capabilities.SLACK_PUBLISHPORT, Capabilities.SLACK_PUBLISHPORT_RANGE)
      }
    })
  }

  Build () {
    if (this.caps[Capabilities.FACEBOOK_API]) {
      this.fbMock = new DockerMocks.Facebook()
    }
    if (this.caps[Capabilities.SLACK_API]) {
      this.slackMock = new DockerMocks.Slack()
    }

    return new Promise((resolve, reject) => {
      this.dockerConfig = {
        projectname: this.caps[Capabilities.PROJECTNAME],
        dockercomposepath: this.caps[Capabilities.DOCKERCOMPOSEPATH],
        uniquecontainernames: this.caps[Capabilities.DOCKERUNIQUECONTAINERNAMES],
        composefiles: []
      }

      async.series([

        (baseComplete) => {
          super.Build().then(() => baseComplete()).catch(baseComplete)
        },

        (dockerfileCreated) => {
          const dockerfileBotium = path.resolve(this.repo.workingDirectory, 'Dockerfile.botium')
          fs.stat(dockerfileBotium, (err, stats) => {
            if (!err && stats.isFile()) {
              debug(`Dockerfile ${dockerfileBotium} already present, using it.`)
              dockerfileCreated()
            } else {
              const templateFile = path.resolve(botiumPackageRootDir, 'src/Dockerfile.botium.template')
              fs.readFile(templateFile, 'utf8', (err, data) => {
                if (err) return dockerfileCreated(`Reading docker template file ${templateFile} failed: ${err}`)
                const viewData = {
                  STARTCMD: this.caps[Capabilities.STARTCMD],
                  DOCKERIMAGE: this.caps[Capabilities.DOCKERIMAGE]
                }
                const convertedFile = mustache.render(data, viewData)
                fs.writeFile(dockerfileBotium, convertedFile, (err) => {
                  if (err) return dockerfileCreated(`Writing dockerfile ${dockerfileBotium} failed: ${err}`)

                  this.cleanupTasks.push((cb) => {
                    fs.stat(dockerfileBotium, (err, stats) => {
                      if (!err && stats.isFile()) {
                        fs.unlink(dockerfileBotium, cb)
                      } else {
                        cb()
                      }
                    })
                  })
                  dockerfileCreated()
                })
              })
            }
          })
        },

        (dockercomposeMainUsed) => {
          const dockercomposeMain = path.resolve(botiumPackageRootDir, 'src/docker-compose.botium.yml')
          this.dockerConfig.composefiles.push(dockercomposeMain)
          dockercomposeMainUsed()
        },

        (syslogPortSelected) => {
          if (this.caps[Capabilities.DOCKERSYSLOGPORT]) {
            this.syslogPort = this.caps[Capabilities.DOCKERSYSLOGPORT]
            syslogPortSelected()
          } else {
            TcpPortUtils.GetFreePortInRange('127.0.0.1', this.caps[Capabilities.DOCKERSYSLOGPORT_RANGE])
              .then((syslogPort) => {
                this.syslogPort = syslogPort
                syslogPortSelected()
              })
              .catch(syslogPortSelected)
          }
        },

        (facebookPortSelected) => {
          if (this.fbMock) {
            this.fbMock.SelectPublishPort(this.caps).then(() => facebookPortSelected()).catch(facebookPortSelected)
          } else {
            facebookPortSelected()
          }
        },

        (slackPortSelected) => {
          if (this.slackMock) {
            this.slackMock.SelectPublishPort(this.caps).then(() => slackPortSelected()).catch(slackPortSelected)
          } else {
            slackPortSelected()
          }
        },

        (facebookMockPrepared) => {
          if (this.fbMock) {
            this.fbMock.PrepareDocker(path.resolve(this.tempDirectory, 'fbmock')).then(() => facebookMockPrepared()).catch(facebookMockPrepared)
          } else {
            facebookMockPrepared()
          }
        },

        (slackMockPrepared) => {
          if (this.slackMock) {
            this.slackMock.PrepareDocker(path.resolve(this.tempDirectory, 'fbmock')).then(() => slackMockPrepared()).catch(slackMockPrepared)
          } else {
            slackMockPrepared()
          }
        },

        (dockercomposeUsed) => {
          if (this.fbMock) {
            this.dockerConfig.composefiles.push(this.fbMock.GetDockerCompose())
          }
          if (this.slackMock) {
            this.dockerConfig.composefiles.push(this.slackMock.GetDockerCompose())
          }
          dockercomposeUsed()
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
          const mockLog = {
            driver: 'syslog',
            options: {
              'syslog-address': `udp://127.0.0.1:${this.syslogPort}`
            }
          }
          if (this.fbMock) {
            this.fbMock.FillDockerEnv(composeEnv, this.caps, mockLog)
          }
          if (this.slackMock) {
            this.slackMock.FillDockerEnv(composeEnv, this.caps, mockLog)
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
    this.eventEmitter.emit(Events.CONTAINER_STARTING, this)

    return new Promise((resolve, reject) => {
      async.series([

        (baseComplete) => {
          super.Start().then(() => baseComplete()).catch(baseComplete)
        },

        (syslogStarted) => {
          let waitFor = Promise.resolve()
          if (this.syslogServer) {
            waitFor = this.syslogServer.stop()
          }
          waitFor.then(() => {
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
          }).catch((err) => {
            syslogStarted(`Cannot stop running syslog server: ${util.inspect(err)}`)
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
          if (this.fbMock) {
            this.fbMock.Start(this).then(() => facebookMockupOnline()).catch(facebookMockupOnline)
          } else {
            facebookMockupOnline()
          }
        },

        (slackMockupOnline) => {
          if (this.slackMock) {
            this.slackMock.Start(this).then(() => slackMockupOnline()).catch(slackMockupOnline)
          } else {
            slackMockupOnline()
          }
        }

      ], (err) => {
        if (err) {
          this.eventEmitter.emit(Events.CONTAINER_START_ERROR, this, err)
          return reject(new Error(`Start failed ${util.inspect(err)}`))
        }
        this.eventEmitter.emit(Events.CONTAINER_STARTED, this)
        resolve(this)
      })
    })
  }

  UserSays (mockMsg) {
    return new Promise((resolve, reject) => {
      if (this.fbMock && this.fbMock.socket) {
        this.fbMock.socket.emit(BotiumMockCommand.MOCKCMD_SENDTOBOT, mockMsg)
        this.eventEmitter.emit(Events.MESSAGE_SENTTOBOT, this, mockMsg)
        resolve(this)
      } else if (this.slackMock && this.slackMock.socket) {
        this.slackMock.socket.emit(BotiumMockCommand.MOCKCMD_SENDTOBOT, mockMsg)
        this.eventEmitter.emit(Events.MESSAGE_SENTTOBOT, this, mockMsg)
        resolve(this)
      } else {
        this.eventEmitter.emit(Events.MESSAGE_SENDTOBOT_ERROR, this, 'No Mock online')
        reject(new Error('No Mock online'))
      }
    })
  }

  Stop () {
    this.eventEmitter.emit(Events.CONTAINER_STOPPING, this)

    return new Promise((resolve, reject) => {
      async.series([

        (baseComplete) => {
          super.Stop().then(() => baseComplete()).catch(baseComplete)
        },

        (facebookStopDone) => {
          if (this.fbMock) {
            this.fbMock.Stop().then(() => facebookStopDone()).catch(facebookStopDone)
          } else {
            facebookStopDone()
          }
        },

        (slackStopDone) => {
          if (this.slackMock) {
            this.slackMock.Stop().then(() => slackStopDone()).catch(slackStopDone)
          } else {
            slackStopDone()
          }
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
            .then(() => {
              this.syslogServer = null
              syslogStopped()
            })
            .catch((err) => {
              syslogStopped(`Cannot stop syslog server: ${util.inspect(err)}`)
            })
        }

      ], (err) => {
        if (err) {
          this.eventEmitter.emit(Events.CONTAINER_STOP_ERROR, this, err)
          return reject(new Error(`Stop failed ${util.inspect(err)}`))
        }
        this.eventEmitter.emit(Events.CONTAINER_STOPPED, this)
        resolve(this)
      })
    })
  }

  Clean () {
    this.eventEmitter.emit(Events.CONTAINER_CLEANING, this)

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

        (baseComplete) => {
          super.Clean().then(() => baseComplete()).catch(baseComplete)
        }

      ], (err) => {
        if (err) {
          this.eventEmitter.emit(Events.CONTAINER_CLEAN_ERROR, this, err)
          return reject(new Error(`Cleanup failed ${util.inspect(err)}`))
        }
        this.eventEmitter.emit(Events.CONTAINER_CLEANED, this)
        resolve(this)
      })
    })
  }
}
