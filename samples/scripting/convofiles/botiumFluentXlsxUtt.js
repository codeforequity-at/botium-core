const BotDriver = require('../../../index').BotDriver
const Capabilities = require('../../../index').Capabilities

console.log('Please make sure that botium-connector-watson module is installed before running this sample')

const driver = new BotDriver()
  .setCapability(Capabilities.SCRIPTING_ENABLE_MEMORY, true)
  .setCapability(Capabilities.SCRIPTING_XLSX_SHEETNAMES, 'Dialogs')
  .setCapability(Capabilities.SCRIPTING_XLSX_SHEETNAMES_UTTERANCES, 'Utterances')
  .setCapability(Capabilities.SCRIPTING_XLSX_STARTROW, 2)
  .setCapability(Capabilities.SCRIPTING_XLSX_STARTCOL, 1)

driver.BuildFluent()
  .ReadScripts('convos')
  .RunScripts()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
