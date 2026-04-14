const botiumCore = require('../dist/botium-cjs.cjs')
const Lib = botiumCore.Lib || botiumCore.default.Lib
module.exports = Lib.SimpleRestContainer
