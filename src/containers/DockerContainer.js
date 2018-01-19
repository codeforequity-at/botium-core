const fs = require('fs')
const util = require('util')
const async = require('async')
const path = require('path')
const yaml = require('write-yaml')
const mustache = require('mustache')
const findRoot = require('find-root')
const _ = require('lodash')
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
const ProcessUtils = require('../helpers/ProcessUtils')
const SafeFileCopy = require('../helpers/SafeFileCopy')

const botiumPackageRootDir = findRoot()

module.exports = class DockerContainer extends BaseContainer {
  Validate () {
    return super.Validate().then(() => {
      this._AssertCapabilityExists(Capabilities.DOCKERCOMPOSEPATH)
      this._AssertCapabilityExists(Capabilities.STARTCMD)
      this._AssertCapabilityExists(Capabilities.DOCKERIMAGE)
      this._AssertOneCapabilityExists(Capabilities.DOCKERSYSLOGPORT, Capabilities.DOCKERSYSLOGPORT_RANGE)
      if (this.caps[Capabilities.DOCKERMACHINE]) {
        this._AssertCapabilityExists(Capabilities.DOCKERMACHINEPATH)
      }
      if (this.caps[Capabilities.FACEBOOK_API]) {
        this._AssertCapabilityExists(Capabilities.FACEBOOK_WEBHOOK_PORT)
        this._AssertCapabilityExists(Capabilities.FACEBOOK_WEBHOOK_PATH)
        this._AssertOneCapabilityExists(Capabilities.FACEBOOK_PUBLISHPORT, Capabilities.FACEBOOK_PUBLISHPORT_RANGE)
      }

      if (this.caps[Capabilities.SLACK_API]) {
        this._AssertCapabilityExists(Capabilities.SLACK_EVENT_PORT)
        this._AssertCapabilityExists(Capabilities.SLACK_EVENT_PATH)
        this._AssertCapabilityExists(Capabilities.SLACK_OAUTH_PORT)
        this._AssertCapabilityExists(Capabilities.SLACK_OAUTH_PATH)
        this._AssertOneCapabilityExists(Capabilities.SLACK_PUBLISHPORT, Capabilities.SLACK_PUBLISHPORT_RANGE)
      }

      if (this.caps[Capabilities.BOTFRAMEWORK_API]) {
        this._AssertCapabilityExists(Capabilities.BOTFRAMEWORK_APP_ID)
        this._AssertCapabilityExists(Capabilities.BOTFRAMEWORK_CHANNEL_ID)
        this._AssertCapabilityExists(Capabilities.BOTFRAMEWORK_WEBHOOK_PORT)
        this._AssertCapabilityExists(Capabilities.BOTFRAMEWORK_WEBHOOK_PATH)
        this._AssertOneCapabilityExists(Capabilities.BOTFRAMEWORK_PUBLISHPORT, Capabilities.BOTFRAMEWORK_PUBLISHPORT_RANGE)
      }
    })
  }

  Build () {
    if (this.caps[Capabilities.FACEBOOK_API]) {
      debug('Adding Facebook Mock to Docker compose')
      this.fbMock = new DockerMocks.Facebook()
    }
    if (this.caps[Capabilities.SLACK_API]) {
      debug('Adding Slack Mock to Docker compose')
      this.slackMock = new DockerMocks.Slack()
    }
    if (this.caps[Capabilities.BOTFRAMEWORK_API]) {
      debug('Adding BotFramework Mock to Docker compose')
      this.botframeworkMock = new DockerMocks.BotFramework()
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

        (dockerIpFound) => {
          if (this.caps[Capabilities.DOCKERMACHINE]) {
            ProcessUtils.childProcessRun(this.caps[Capabilities.DOCKERMACHINEPATH], [ 'ip' ], false)
              .then((output) => {
                if (output.stdout && output.stdout.length > 0) {
                  this.dockerIp = `${output.stdout[0]}`.trim()
                  if (this.dockerIp) {
                    debug(`Found docker-machine ip ${this.dockerIp}.`)
                    return dockerIpFound()
                  }
                }
                dockerIpFound(`No docker-machine ip found in command output ${output}`)
              }).catch(dockerIpFound)
          } else {
            this.dockerIp = '127.0.0.1'
            dockerIpFound()
          }
        },

        (dockerfileCreated) => {
          const dockerfileBotium = path.resolve(this.repo.workingDirectory, 'Dockerfile.botium')
          fs.stat(dockerfileBotium, (err, stats) => {
            if (!err && stats.isFile()) {
              debug(`Dockerfile ${dockerfileBotium} already present, using it.`)
              dockerfileCreated()
            } else {
              const templateFile = path.resolve(botiumPackageRootDir, 'src', 'Dockerfile.botium.template')
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
          const dockercomposeMain = path.resolve(botiumPackageRootDir, 'src', 'docker-compose.botium.yml')
          const dockercomposeBotium = path.resolve(this.tempDirectory, 'docker-compose.botium.yml')

          SafeFileCopy(dockercomposeMain, dockercomposeBotium)
            .then(() => {
              this.dockerConfig.composefiles.push(dockercomposeBotium)
              dockercomposeMainUsed()
            })
            .catch((err) => dockercomposeMainUsed(`Copying docker compose template file ${dockercomposeMain} failed: ${err}`))
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
            this.fbMock.SelectPublishPort(this.dockerIp, this.caps).then(() => facebookPortSelected()).catch(facebookPortSelected)
          } else {
            facebookPortSelected()
          }
        },

        (slackPortSelected) => {
          if (this.slackMock) {
            this.slackMock.SelectPublishPort(this.dockerIp, this.caps).then(() => slackPortSelected()).catch(slackPortSelected)
          } else {
            slackPortSelected()
          }
        },

        (botframeworkPortSelected) => {
          if (this.botframeworkMock) {
            this.botframeworkMock.SelectPublishPort(this.dockerIp, this.caps).then(() => botframeworkPortSelected()).catch(botframeworkPortSelected)
          } else {
            botframeworkPortSelected()
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
            this.slackMock.PrepareDocker(path.resolve(this.tempDirectory, 'slackmock')).then(() => slackMockPrepared()).catch(slackMockPrepared)
          } else {
            slackMockPrepared()
          }
        },

        (botframeworkMockPrepared) => {
          if (this.botframeworkMock) {
            this.botframeworkMock.PrepareDocker(path.resolve(this.tempDirectory, 'botframeworkmock')).then(() => botframeworkMockPrepared()).catch(botframeworkMockPrepared)
          } else {
            botframeworkMockPrepared()
          }
        },

        (dockercomposeUsed) => {
          const promises = []
          if (this.fbMock) {
            promises.push(this.fbMock.GetDockerCompose().then((f) => {
              this.dockerConfig.composefiles.push(f)
            }))
          }
          if (this.slackMock) {
            promises.push(this.slackMock.GetDockerCompose().then((f) => {
              this.dockerConfig.composefiles.push(f)
            }))
          }
          if (this.botframeworkMock) {
            promises.push(this.botframeworkMock.GetDockerCompose().then((f) => {
              this.dockerConfig.composefiles.push(f)
            }))
          }
          Promise.all(promises).then(() => dockercomposeUsed())
        },

        (dockercomposeEnvUsed) => {
          const sysLog = {
            driver: 'syslog',
            options: {
              'syslog-address': `udp://127.0.0.1:${this.syslogPort}`
            }
          }

          const composeEnv = {
            version: '2',
            services: {
              botium: {
                build: {
                  context: this.repo.workingDirectory
                },
                logging: _.cloneDeep(sysLog),
                volumes: [
                  `${this.repo.workingDirectory}:/usr/src/app`
                ]
              }
            }
          }
          if (this.envs) {
            composeEnv.services.botium.environment = this.envs
          }
          if (this.fbMock) {
            this.fbMock.FillDockerEnv(composeEnv, this.caps, sysLog)
          }
          if (this.slackMock) {
            this.slackMock.FillDockerEnv(composeEnv, this.caps, sysLog)
          }
          if (this.botframeworkMock) {
            this.botframeworkMock.FillDockerEnv(composeEnv, this.caps, sysLog)
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

        (dockercomposeLocalOverrideUsed) => {
          const dockercomposeOverride = path.resolve(process.cwd(), 'docker-compose.botium.override.yml')
          fs.stat(dockercomposeOverride, (err, stats) => {
            if (!err && stats.isFile()) {
              debug(`Docker-Compose file ${dockercomposeOverride} present, using it.`)
              this.dockerConfig.composefiles.push(dockercomposeOverride)
            }
            dockercomposeLocalOverrideUsed()
          })
        },

        (dockerReady) => {
          this.dockerConfig.composefiles = _.uniq(this.dockerConfig.composefiles)
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
        },

        (botframeworkMockupOnline) => {
          if (this.botframeworkMock) {
            this.botframeworkMock.Start(this).then(() => botframeworkMockupOnline()).catch(botframeworkMockupOnline)
          } else {
            botframeworkMockupOnline()
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
      } else if (this.botframeworkMock && this.botframeworkMock.socket) {
        this.botframeworkMock.socket.emit(BotiumMockCommand.MOCKCMD_SENDTOBOT, mockMsg)
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

        (botframeworkStopDone) => {
          if (this.botframeworkMock) {
            this.botframeworkMock.Stop(this).then(() => botframeworkStopDone()).catch(botframeworkStopDone)
          } else {
            botframeworkStopDone()
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
