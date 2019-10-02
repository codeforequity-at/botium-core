const CompilerObjectBase = require('./CompilerObjectBase')

module.exports = class CompilerJson extends CompilerObjectBase {
  constructor (context, caps = {}) {
    super(context, caps)
  }

  Deserialize (scriptData) {
    return JSON.parse(scriptData)
  }
}
