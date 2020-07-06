const tcpPortUsed = require('tcp-port-used')
const debug = require('debug')('botium-core-TcpPortUtils')

module.exports = {
  WaitForPort: async (hostname, portToCheck) => {
    const timeout = ms => new Promise(resolve => setTimeout(resolve, ms))

    while (true) {
      debug(`WaitForPort checking port usage ${hostname}:${portToCheck} before proceed`)
      try {
        const inUse = await tcpPortUsed.check(portToCheck, hostname)
        debug(`WaitForPort port usage (${hostname}:${portToCheck}): ${inUse}`)
        if (inUse) {
          return
        } else {
          await timeout(2000)
        }
      } catch (err) {
        debug(`WaitForPort error on port check ${hostname}:${portToCheck}: ${err}`)
        await timeout(2000)
      }
    }
  },

  GetFreePortInRange: async (hostname, portRange) => {
    const rangeExpression = /^([0-9]+)-([0-9]+)$/
    const rangeMatch = portRange.match(rangeExpression)
    if (!rangeMatch || rangeMatch.length !== 3) {
      throw new Error(`GetFreePortInRange Not a port range expression "${portRange}", expected portFrom-portTo`)
    }

    const portToCheckMax = parseInt(rangeMatch[2])
    let portToCheck = parseInt(rangeMatch[1])

    while (portToCheck <= portToCheckMax) {
      debug(`GetFreePortInRange checking port usage ${hostname}:${portToCheck} before proceed`)

      try {
        const inUse = await tcpPortUsed.check(portToCheck, hostname)
        debug(`GetFreePortInRange port usage (${hostname}:${portToCheck}): ${inUse}`)
        if (inUse) {
          portToCheck++
        } else {
          return portToCheck
        }
      } catch (err) {
        debug(`GetFreePortInRange error on port check ${hostname}:${portToCheck}: ${err}`)
        portToCheck++
      }
    }
    throw new Error(`GetFreePortInRange no free port found in range ${portRange}`)
  }
}
