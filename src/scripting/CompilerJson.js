const CompilerObjectBase = require('./CompilerObjectBase')

module.exports = class CompilerJson extends CompilerObjectBase {
  constructor (context, caps = {}) {
    super(context, caps)
  }

  Deserialize (sciptData) {
    return JSON.parse(sciptData)
  }
}
