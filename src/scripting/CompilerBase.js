const Capabilities = require('../Capabilities')

module.exports = class CompilerBase {
  constructor (caps = {}) {
    this.caps = caps
  }

  Validate () {
    return new Promise((resolve) => {
      this._AssertCapabilityExists(Capabilities.SCRIPTING_INPUT_TYPE)
      resolve()
    })
  }

  GetHeaders (scriptData) {
    return this.Compile(scriptData).then((convos) => {
      if (convos) return []
      else return convos.map((convo) => convo.header)
    })
  }

  Compile (scriptData) {
    throw new Error(`not implemented`)
  }

  Decompile (convos) {
    throw new Error(`not implemented`)
  }

  _AssertCapabilityExists (cap) {
    if (!this.caps[cap]) {
      throw new Error(`Capability property ${cap} not set`)
    }
  }
}
