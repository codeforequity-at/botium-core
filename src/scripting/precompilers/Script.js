const _ = require('lodash')
const { executeHookSync, getHook } = require('../../helpers/HookUtils')

module.exports.precompile = (scriptBuffer, capSuffixAndVal, filename) => {
  if (!(capSuffixAndVal.script || capSuffixAndVal.SCRIPT)) {
    throw new Error('Script is not defined')
  }

  let scriptData = scriptBuffer
  if (Buffer.isBuffer(scriptData)) {
    scriptData = scriptData.toString()
  }
  if (_.isString(scriptData)) {
    try {
      scriptData = JSON.parse(scriptData)
    } catch (err) {
    }
  }

  const hook = getHook(capSuffixAndVal.script || capSuffixAndVal.SCRIPT)

  const response = executeHookSync(hook, { scriptData, filename })

  if (!response) {
    return
  }

  return response.scriptBuffer ? response : { scriptBuffer: response }
}
