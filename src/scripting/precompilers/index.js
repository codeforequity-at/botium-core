const util = require('util')
const { isJson } = require('../../helpers/Utils')

const PROVIDERS = {
  JSON_TO_JSON_JSONPATH: require('./JsonToJson'),
  SCRIPT: require('./Script')
}
const CAPABILITY_PREFIX = 'PRECOMPILERS'
const { flatCababilities } = require('../../helpers/CapabilitiesUtils')

module.exports.execute = (scriptBuffer, options) => {
  const { caps, filename } = options
  const ownCaps = flatCababilities(caps, CAPABILITY_PREFIX)

  for (const capSuffixAndVal of ownCaps) {
    if (!(capSuffixAndVal.NAME || capSuffixAndVal.name)) {
      throw new Error(`Precompiler name not defined in ${util.inspect(capSuffixAndVal)}`)
    }
    const provider = PROVIDERS[capSuffixAndVal.NAME || capSuffixAndVal.name]

    if (!provider) {
      throw new Error(`Precompiler ${util.inspect(capSuffixAndVal.NAME || capSuffixAndVal.name)} not found using caps ${util.inspect(capSuffixAndVal)}`)
    }

    const result = provider.precompile(scriptBuffer, capSuffixAndVal, filename)
    if (result) {
      if (!result.scriptBuffer) {
        return null
      }
      result.scriptBuffer = isJson(result.scriptBuffer)

      return result
    }
  }
}
