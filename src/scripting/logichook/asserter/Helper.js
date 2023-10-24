const _ = require('lodash')
module.exports.extractArgs = (args, names) => {
  names = _.isString(names) ? [names] : names
  const res = { statArgs: [], dynArgs: {} }
  if (!args) {
    return res
  }

  for (const arg of args) {
    const name = names.find(name => arg.startsWith(name + ':'))
    if (name) {
      res.dynArgs[name] = arg.substring(name.length + 1)
    } else {
      res.statArgs.push(arg)
    }
  }

  return res
}
module.exports.BOTIUM_RETRY_FAILED = 'BOTIUM_RETRY_FAILED'
module.exports.BOTIUM_TEXT_MATCHING_MODE = 'BOTIUM_TEXT_MATCHING_MODE'
module.exports.BOTIUM_TEXT_MODE = 'BOTIUM_TEXT_MODE'
