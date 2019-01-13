const fs = require('fs')
const path = require('path')
const BotDriver = require('../../../index').BotDriver
const Capabilities = require('../../../index').Capabilities

console.log('Please make sure that botium-connector-watson module is installed before running this sample')

function assert (botresponse, tomatch, stepTag) {
  console.log(`${stepTag}: BOTRESPONSE "${botresponse}", EXPECTED "${tomatch}"`)
}
function fail (err) {
  console.log(`ERROR: <${err}>`)
  throw err
}

const driver = new BotDriver()
  .setCapability(Capabilities.SCRIPTING_ENABLE_MEMORY, true)

const scriptBuffer = fs.readFileSync(path.join(__dirname, '/convos/memory/restaurant.convo.txt'))

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
