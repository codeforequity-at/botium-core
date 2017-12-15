const async = require('async')
const randomize = require('randomatic')
const slug = require('slug')
const childProcess = require('child_process')
const _ = require('lodash')
const debug = require('debug')('DockerCmd')

module.exports = class DockerCmd {
  constructor ({ projectname, dockercomposepath, composefiles }) {
    this.projectname = projectname
    this.dockercomposepath = dockercomposepath
    this.composefiles = composefiles
    this.containername = slug(`${this.projectname} ${randomize('Aa0', 5)}`)
  }

  setupContainer () {
    let _this = this
    return new Promise((resolve, reject) => {
      async.series([
        (stopDone) => {
          _this.stopContainer(true).then(() => stopDone()).catch(() => stopDone())
        },
        (teardownDone) => {
          _this.teardownContainer(true).then(() => teardownDone()).catch(() => teardownDone())
        },
        (buildContainerDone) => {
          let cmdOptions = _this._dockerComposeCmdOptions()
          cmdOptions.push('build')

          _this._dockerComposeRun(cmdOptions, false).then(() => buildContainerDone()).catch(buildContainerDone)
        }
      ],
      (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  teardownContainer (ignoreErrors) {
    var cmdOptions = this._dockerComposeCmdOptions()
    cmdOptions.push('down')

    return this._dockerComposeRun(cmdOptions, ignoreErrors)
  }

  startContainer () {
    var cmdOptions = this._dockerComposeCmdOptions()
    cmdOptions.push('up')
    cmdOptions.push('-d')

    return this._dockerComposeRun(cmdOptions, false)
  }

  stopContainer (ignoreErrors) {
    var cmdOptions = this._dockerComposeCmdOptions()
    cmdOptions.push('kill')

    return this._dockerComposeRun(cmdOptions, ignoreErrors)
  }

  // Private Functions

  _dockerComposeCmdOptions () {
    var cmdOptions = []
    cmdOptions.push('-p')
    cmdOptions.push(this.containername)
    if (process.env.DEBUG && process.env.DEBUG.indexOf('DockerCmdVerbose') >= 0) {
      cmdOptions.push('--verbose')
    }

    _.forEach(this.composefiles, (composefile) => {
      cmdOptions.push('-f')
      cmdOptions.push(composefile)
    })
    return cmdOptions
  }

  _dockerComposeRun (cmdOptions, ignoreErrors) {
    return new Promise((resolve, reject) => {
      debug('Running Docker Command: ' + this.dockercomposepath + ' ' + _.join(cmdOptions, ' '))

      var dockerProcess = childProcess.spawn(this.dockercomposepath, cmdOptions, this._getChildProcessOptions())
      dockerProcess.on('close', (code) => {
        debug('docker-compose exited with code ' + code)

        if (code === 0 || ignoreErrors) {
          resolve()
        } else {
          reject(new Error('docker-compose returned error code ' + code))
        }
      })
      dockerProcess.on('error', (err) => {
        if (ignoreErrors) {
          resolve()
        } else {
          reject(new Error('docker-compose error ' + err))
        }
      })
    })
  }

  _getChildProcessOptions () {
    if (process.env.DEBUG && process.env.DEBUG.indexOf('DockerCmd') >= 0) {
      return {stdio: ['ignore', process.stdout, process.stderr]}
    } else {
      return {stdio: ['ignore', 'ignore', 'ignore']}
    }
  }
}
