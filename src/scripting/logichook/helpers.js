const util = require('util')
const _ = require('lodash')

const extractParams = ({ argNames, isGlobal, globalArgs, args }) => {
  if (!isGlobal) {
    if (!args || args.length !== argNames.length) {
      throw new Error(`Expected 2 arguments ${util.inspect(args)}`)
    }
  }

  const result = {}
  for (const [i, argName] of argNames.entries()) {
    const argVal = isGlobal ? (globalArgs && globalArgs[argName]) : (args && args[i])
    if (_.isUndefined(argVal)) {
      if (isGlobal) {
        throw new Error(`${argName} is missing. globalArgs: ${util.inspect(this.globalArgs)}`)
      } else {
        throw new Error(`${argName} is missing. args: ${util.inspect(args)}`)
      }
    }
    result[argName] = argVal
  }
  return result
}

module.exports = {
  extractParams
}
