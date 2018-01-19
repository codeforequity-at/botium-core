const async = require('async')
const randomize = require('randomatic')
const slug = require('slug')
const _ = require('lodash')

const ProcessUtils = require('../helpers/ProcessUtils')

module.exports = class DockerCmd {
  constructor ({ projectname, dockercomposepath, uniquecontainernames, composefiles }) {
    this.projectname = projectname
    this.dockercomposepath = dockercomposepath
    this.composefiles = composefiles
    if (uniquecontainernames) {
      this.containername = slug(`${this.projectname} ${randomize('Aa0', 5)}`)
    } else {
      this.containername = slug(`${this.projectname}`)
    }
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
    return ProcessUtils.childProcessRun(this.dockercomposepath, cmdOptions, ignoreErrors)
  }
}
