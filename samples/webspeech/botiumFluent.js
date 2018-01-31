const BotDriver = require('../../index').BotDriver
const Capabilities = require('../../index').Capabilities
const Source = require('../../index').Source

function assert (expected, actual) {
  if (!actual || actual.indexOf(expected) < 0) {
    console.log(`ERROR: Expected <${expected}>, got <${actual}>`)
  } else {
    console.log(`SUCCESS: Got Expected <${expected}>`)
  }
}

const driver = new BotDriver()
  .setCapability(Capabilities.PROJECTNAME, 'webspeechsample')
  .setCapability(Capabilities.CONTAINERMODE, 'webspeech')
  .setCapability(Capabilities.WAITFORBOTTIMEOUT, 30000)

driver.BuildFluent()
  .Start()
  .UserSaysText('computer wie ist das wetter morgen')
  .WaitBotSaysText((text) => console.log(text))
  .UserSaysText('computer danke')
  .WaitBotSaysText((text) => console.log(text))
/*  .WaitBotSaysText(null, 10000, (text) => assert('Hello... What\'s your name?', text))
  .UserSaysText('John')
  .WaitBotSaysText((text) => assert('Hi John, How many years have you been coding?', text))
  .UserSaysText('5')
  .WaitBotSaysText((text) => assert('What language do you code Node using?', text))
  .UserSaysText('CoffeeScript')
  .WaitBotSaysText((text) => assert('Got it... John you\'ve been programming for 5 years and use CoffeeScript.', text))
  */
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })