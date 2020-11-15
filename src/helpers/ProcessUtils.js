const util = require('util')
const childProcess = require('child_process')
const _ = require('lodash')
const debug = require('debug')('botium-core-ProcessUtils')

module.exports = {
  childCommandLineRun: (cmd, ignoreErrors = false, processOptions = {}) => {
    const cmdOptions = cmd.split(' ')
    const cmdPart = cmdOptions[0]
    cmdOptions.splice(0, 1)
    return module.exports.childProcessRun(cmdPart, cmdOptions, ignoreErrors, processOptions)
  },

  childProcessRun: (cmd, cmdOptions, ignoreErrors = false, processOptions = {}) => {
    return new Promise((resolve, reject) => {
      debug('Running Command: ' + cmd + ' ' + _.join(cmdOptions, ' '))

      const runningProcess = childProcess.spawn(cmd, cmdOptions, processOptions)

      const stdout = []
      const stderr = []

      runningProcess.stdout.on('data', (data) => {
        if (data) {
          debug(`${cmd} STDOUT: ${data}`)
          stdout.push(data)
        }
      })
      runningProcess.stderr.on('data', (data) => {
        if (data) {
          debug(`${cmd} STDERR: ${data}`)
          stderr.push(data)
        }
      })
      runningProcess.on('close', (code) => {
        debug(cmd + ' exited with code ' + code)
        if (code === 0 || ignoreErrors) {
          resolve({ stdout, stderr })
        } else {
          reject(new Error(`${cmd} returned error code ${code}`))
        }
      })
      runningProcess.on('error', (err) => {
        if (ignoreErrors) {
          resolve()
        } else {
          reject(new Error(`${cmd} failed: ${util.inspect(err)}`))
        }
      })
    })
  }
}
