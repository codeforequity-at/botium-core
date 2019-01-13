const BotDriver = require('../../../../index').BotDriver
const Capabilities = require('../../../../index').Capabilities

function assert (expected, actual) {
  if (!actual || actual.indexOf(expected) < 0) {
    console.log(`ERROR: Expected <${expected}>, got <${actual}>`)
  } else {
    console.log(`SUCCESS: Got Expected <${expected}>`)
  }
}

const driver = new BotDriver()
  .setCapability(Capabilities.CLEANUPTEMPDIR, false)

driver.BuildFluent()
  .Start()
  .UserSaysText('hello')
  .WaitBotSaysText((text) => assert('What is your name, human?', text))
  .UserSaysText('Fred')
  .WaitBotSaysText((text) => assert('Got it. You are Fred.', text))
  .UserSaysText('OK')
  .WaitBotSaysText((text) => assert('Your name is Fred.', text))
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
