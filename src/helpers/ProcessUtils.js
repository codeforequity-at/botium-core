import util from 'util'
import childProcess from 'child_process'
import _ from 'lodash'
import createDebug from 'debug'
const debug = createDebug('botium-core-ProcessUtils')

const childProcessRun = (cmd, cmdOptions, ignoreErrors = false, processOptions = {}) => {
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

const childCommandLineRun = (cmd, ignoreErrors = false, processOptions = {}) => {
  const cmdOptions = cmd.split(' ')
  const cmdPart = cmdOptions[0]
  cmdOptions.splice(0, 1)
  return childProcessRun(cmdPart, cmdOptions, ignoreErrors, processOptions)
}

export default {
  childCommandLineRun,
  childProcessRun
}
