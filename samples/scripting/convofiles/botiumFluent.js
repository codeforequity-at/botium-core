const fs = require('fs')
const path = require('path')
const BotDriver = require('../../../index').BotDriver

console.log('Please make sure that botium-connector-watson module is installed before running this sample')

function assert (botresponse, tomatch, stepTag) {
  console.log(`${stepTag}: BOTRESPONSE "${botresponse}", EXPECTED "${tomatch}"`)
}
function fail (err) {
  console.log(`ERROR: <${err}>`)
  throw err
}

const driver = new BotDriver()

const scriptBuffer = fs.readFileSync(path.join(__dirname, 'convos/txt/restaurant.convo.txt'))

const compiler = driver.BuildCompiler()
const convos = compiler.Compile(scriptBuffer, 'SCRIPTING_FORMAT_TXT')
const decompiledscript = compiler.Decompile(convos, 'SCRIPTING_FORMAT_TXT')
console.log(decompiledscript)

driver.BuildFluent()
  .Compile(scriptBuffer, 'SCRIPTING_FORMAT_TXT')
  .RunScripts(assert, fail)
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
