const _ = require('lodash')

module.exports.hasWaitForBotTimeout = (transciptError) => {
  if (!transciptError) {
    return false
  }
  const str = transciptError.message || (_.isString(transciptError) ? transciptError : null)
  if (!str) {
    return false
  }
  return str.indexOf(': error waiting for bot - Bot did not respond within') > 0
}
