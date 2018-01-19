const async = require('async')
const tcpPortUsed = require('tcp-port-used')
const debug = require('debug')('botium-TcpPortUtils')

module.exports = {
  WaitForPort: (hostname, portToCheck) => {
    return new Promise((resolve, reject) => {
      let online = false
      async.until(
        () => online,
        (callback) => {
          debug(`WaitForPort checking port usage ${hostname}:${portToCheck} before proceed`)

          tcpPortUsed.check(portToCheck, hostname)
            .then((inUse) => {
              debug(`WaitForPort port usage (${hostname}:${portToCheck}): ${inUse}`)
              if (inUse) {
                online = true
                callback()
              } else {
                setTimeout(callback, 2000)
              }
            }, (err) => {
              debug(`WaitForPort error on port check ${hostname}:${portToCheck}: ${err}`)
              setTimeout(callback, 2000)
            })
        },
        (err) => {
          if (err) return reject(err)
          resolve()
        })
    })
  },

  GetFreePortInRange: (hostname, portRange) => {
    return new Promise((resolve, reject) => {
      const rangeExpression = /^([0-9]+)-([0-9]+)$/
      const rangeMatch = portRange.match(rangeExpression)
      if (!rangeMatch || rangeMatch.length !== 3) {
        return reject(new Error(`GetFreePortInRange Not a port range expression "${portRange}", expected portFrom-portTo`))
      }
      let found = false
      let portToCheck = parseInt(rangeMatch[1])
      let portToCheckMax = parseInt(rangeMatch[2])
      async.until(
        () => found || portToCheck > portToCheckMax,
        (callback) => {
          debug(`GetFreePortInRange checking port usage ${hostname}:${portToCheck} before proceed`)

          tcpPortUsed.check(portToCheck, hostname)
            .then((inUse) => {
              debug(`GetFreePortInRange port usage (${hostname}:${portToCheck}): ${inUse}`)
              if (inUse) {
                portToCheck++
                callback()
              } else {
                found = true
                callback()
              }
            }, (err) => {
              debug(`GetFreePortInRange error on port check ${hostname}:${portToCheck}: ${err}`)
              portToCheck++
              callback()
            })
        },
        (err) => {
          if (err) return reject(err)
          if (!found) return reject(new Error(`GetFreePortInRange no free port found in range ${portRange}`))
          resolve(portToCheck)
        })
    })
  }
}
