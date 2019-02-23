module.exports = class CompilerBase {
  constructor ({ AddConvos, AddPartialConvos, AddUtterances, GetPartialConvos, IsAsserterValid, IsLogicHookValid, IsUserInputValid, scriptingEvents }, caps = {}) {
    this.context = {
      AddConvos,
      AddPartialConvos,
      AddUtterances,
      GetPartialConvos,
      IsAsserterValid,
      IsLogicHookValid,
      IsUserInputValid,
      scriptingEvents
    }
    this.caps = caps
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
