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
  .setCapability(Capabilities.PROJECTNAME, 'Testmybot Sample Calculator')
  .setCapability(Capabilities.FACEBOOK_API, true)
  .setCapability(Capabilities.FACEBOOK_WEBHOOK_PORT, 3000)
  .setCapability(Capabilities.FACEBOOK_WEBHOOK_PATH, 'facebook/receive')
  .setCapability(Capabilities.FACEBOOK_SEND_DELIVERY_CONFIRMATION, false)
  .setCapability(Capabilities.CLEANUPTEMPDIR, false)
  .setSource(Source.GITURL, 'https://github.com/codeforequity-at/testmybot-sample-calculator.git')
  .setSource(Source.GITPREPARECMD, 'npm install')
  .setCapability(Capabilities.STARTCMD, 'node index.js')
  .setEnv('NODE_TLS_REJECT_UNAUTHORIZED', 0)
  .setEnv('NODE_ENV', 'dev')
  .setEnv('page_token', 'sample')
  .setEnv('verify_token', 'sample')

driver.BuildFluent()
  .Start()
  .UserSaysText('start')
  .WaitBotSaysText((text) => assert('I can do a very advanced scientific calculations for you ("Addition").', text))
  .WaitBotSaysText((text) => assert('Please tell me the first number!', text))
  .UserSaysText('1')
  .WaitBotSaysText((text) => assert('Please tell me the second number!', text))
  .UserSaysText('1')
  .WaitBotSaysText((text) => assert('1 + 1 = 2', text))
  .WaitBotSaysText((text) => assert('Is this correct ?', text))
  .UserSaysText('yes')
  .WaitBotSaysText((text) => assert('I know.', text))
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
