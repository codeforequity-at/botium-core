const Capabilities = require('../Capabilities')

module.exports = class CompilerBase {
  constructor (caps = {}) {
    this.caps = caps
  }

  Validate () {
    this._AssertCapabilityExists(Capabilities.SCRIPTING_INPUT_TYPE)
  }

  GetHeaders (scriptData) {
    const convos = this.Compile(scriptData)
    if (convos) {
      return convos.map((convo) => convo.header)
    } else {
      return []
    }
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
