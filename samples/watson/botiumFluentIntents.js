const BotDriver = require('../../index').BotDriver
const Capabilities = require('../../index').Capabilities
const Source = require('../../index').Source

const driver = new BotDriver()
  .setCapability(Capabilities.PROJECTNAME, 'IBM Watson Conversation Sample')
  .setCapability(Capabilities.CONTAINERMODE, 'watsonconversation')
  .setCapability(Capabilities.WATSONCONVERSATION_USER, '0274cb6f-3680-4cf7-bd6b-71c7f447542d')
  .setCapability(Capabilities.WATSONCONVERSATION_PASSWORD, 'ZWDE5xo02sby')
  .setCapability(Capabilities.WATSONCONVERSATION_WORKSPACE_ID, '97513bc0-c581-4bec-ac9f-ea6a8ec308a9')
  .setCapability(Capabilities.WATSONCONVERSATION_COPY_WORKSPACE, false)
  .setCapability(Capabilities.WATSONCONVERSATION_USE_INTENT, true)

driver.BuildFluent()
  .Start()
  .UserSaysText('start')
  .WaitBotSaysText(console.log)
  .UserSaysText('failed training')
  .WaitBotSays((msg) => console.log('it should have been failed for duplicate intent confidence of 1 ', msg.sourceData.intents))
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
