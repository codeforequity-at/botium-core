const _ = require('lodash')
const util = require('util')
const PROVIDERS = {
  JSON_TO_JSON_JSONPATH: require('./JsonToJson')
}
const CAPABILITY_PREFIX = 'PRECOMPILERS'
const { flatCababilities } = require('../../helpers/CapabilitiesUtils')

module.exports.execute = (scriptBuffer, options) => {
  const { caps, filename } = options
  const ownCaps = flatCababilities(caps, CAPABILITY_PREFIX)

  for (const capSuffixAndVal of ownCaps) {
    if (!capSuffixAndVal.NAME) {
      throw new Error(`Precompiler name not defined in ${util.inspect(capSuffixAndVal)}`)
    }
    const provider = PROVIDERS[capSuffixAndVal.NAME]

    if (!provider) {
      throw new Error(`Precompiler ${util.inspect(capSuffixAndVal.name)} not found using caps ${util.inspect(capSuffixAndVal)}`)
    }

    const result = provider.precompile(scriptBuffer, capSuffixAndVal, filename)
    if (result) {
      return result
    }
  }
}
