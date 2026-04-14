import util from 'util'
import createDebug from 'debug'
import * as JsonToJson from './JsonToJson.js'
import * as Script from './Script.js'
import * as MarkdownRasa from './MarkdownRasa.js'
import { isJsonObject } from '../../helpers/Utils.js'
import { flatCababilities } from '../../helpers/CapabilitiesUtils.js'

const debug = createDebug('botium-core-Precompilers')

const PROVIDERS = {
  JSON_TO_JSON_JSONPATH: JsonToJson,
  SCRIPT: Script,
  MARKDOWN_RASA: MarkdownRasa
}
const CAPABILITY_PREFIX = 'PRECOMPILERS'

export function execute (scriptBuffer, options) {
  const { caps, filename } = options
  const ownCaps = flatCababilities(caps, CAPABILITY_PREFIX)
  if (Buffer.isBuffer(scriptBuffer)) {
    scriptBuffer = scriptBuffer.toString()
  }

  for (const capSuffixAndVal of ownCaps) {
    if (!(capSuffixAndVal.NAME)) {
      debug(`Precompiler name not defined in ${util.inspect(capSuffixAndVal)}`)
      return null
    }
    const provider = PROVIDERS[capSuffixAndVal.NAME]

    if (!provider) {
      throw new Error(`Precompiler ${util.inspect(capSuffixAndVal.NAME)} not found using caps ${util.inspect(capSuffixAndVal)}`)
    }

    const result = provider.precompile(caps, scriptBuffer, capSuffixAndVal, filename)
    if (result) {
      if (!result.scriptBuffer) {
        return null
      }
      if (isJsonObject(result.scriptBuffer, false)) {
        result.scriptBuffer = JSON.stringify(result.scriptBuffer)
      }

      result.precompiler = capSuffixAndVal.NAME
      // dont let chain the precompilers. It looks more robust
      return result
    }
  }
}
