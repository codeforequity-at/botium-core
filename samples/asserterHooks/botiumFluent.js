const fs = require('fs')
const path = require('path')
const BotDriver = require('botium-core').BotDriver

console.log('Please make sure that botium-connector-watson module is installed before running this sample')

const driver = new BotDriver()

const scriptBuffer = fs.readFileSync(path.join(__dirname, 'convos/txt/restaurant.convo.txt'))

driver.BuildFluent()
  .Compile(scriptBuffer, 'SCRIPTING_FORMAT_TXT')
  .RunScripts()
  .Exec()
  .then(() => {
    console.log('SUCCESS :)')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
