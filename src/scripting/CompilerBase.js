module.exports = class CompilerBase {
  constructor ({ AddConvos, AddUtterances, IsAsserterValid, scriptingEvents }, caps = {}, asserters) {
    this.context = {
      AddConvos,
      AddUtterances,
      IsAsserterValid,
      scriptingEvents
    }
    this.caps = caps
    this.asserters = asserters
  }

  Validate () {
  }

  GetHeaders (scriptBuffer) {
    const convos = this.Compile(scriptBuffer)
    if (convos) {
      return convos.map((convo) => convo.header)
    } else {
      return []
    }
  }

  Compile (scriptBuffer, scriptType) {
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
