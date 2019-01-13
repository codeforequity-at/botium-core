const BotDriver = require('../../index').BotDriver
const Capabilities = require('../../index').Capabilities

function assert (expected, actual) {
  if (!actual || actual.indexOf(expected) < 0) {
    console.log(`ERROR: Expected <${expected}>, got <${actual}>`)
  } else {
    console.log(`SUCCESS: Got Expected <${expected}>`)
  }
}

const driver = new BotDriver()
  .setCapability(Capabilities.BOTIUMGRIDURL, 'http://127.0.0.1:46100')
  .setCapability(Capabilities.PROJECTNAME, 'IBM Watson Conversation Sample')
  .setCapability(Capabilities.CONTAINERMODE, 'watsonconversation')
  .setCapability(Capabilities.WATSONCONVERSATION_USER, '0274cb6f-3680-4cf7-bd6b-71c7f447542d')
  .setCapability(Capabilities.WATSONCONVERSATION_PASSWORD, 'ZWDE5xo02sby')
  .setCapability(Capabilities.WATSONCONVERSATION_WORKSPACE_ID, '97513bc0-c581-4bec-ac9f-ea6a8ec308a9')
  .setCapability(Capabilities.WATSONCONVERSATION_COPY_WORKSPACE, false)

driver.BuildFluent()
  .Start()
  .UserSaysText('start')
  .WaitBotSaysText((text) => assert('Hi. It looks like a nice drive today. What would you like me to do?', text))
  .UserSaysText('turn on the lights please')
  .WaitBotSaysText((text) => assert('I\'ll turn on the lights for you.', text))
  .UserSaysText('play some jazz music')
  .WaitBotSaysText((text) => assert('Great choice! Playing some jazz for you.', text))
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
