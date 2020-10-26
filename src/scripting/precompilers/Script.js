const _ = require('lodash')
const { executeHookSync, getHook } = require('../../helpers/HookUtils')

module.exports.precompile = (caps, scriptBuffer, options, filename) => {
  if (!(options.script || options.SCRIPT)) {
    throw new Error('Script is not defined')
  }

  if (_.isString(scriptBuffer)) {
    try {
      scriptBuffer = JSON.parse(scriptBuffer)
    } catch (err) {
    }
  }

  const hook = getHook(caps, options.SCRIPT)
  const response = executeHookSync(caps, hook, { scriptData: scriptBuffer, filename })

  if (!response) {
    return
  }

  return response.scriptBuffer ? response : { scriptBuffer: response }
}
