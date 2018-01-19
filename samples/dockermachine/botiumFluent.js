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
  .setCapability(Capabilities.PROJECTNAME, 'Botium Facebook Sample 1')
  .setCapability(Capabilities.FACEBOOK_API, true)
  .setCapability(Capabilities.FACEBOOK_WEBHOOK_PORT, 5000)
  .setCapability(Capabilities.FACEBOOK_WEBHOOK_PATH, 'webhook')
  .setCapability(Capabilities.CLEANUPTEMPDIR, false)
  .setCapability(Capabilities.DOCKERMACHINE, true)
  .setCapability(Capabilities.DOCKERSYSLOGPORT, 50000)
  .setSource(Source.LOCALPATH, '.')
  .setCapability(Capabilities.STARTCMD, 'npm install && node index.js')
  .setEnv('NODE_TLS_REJECT_UNAUTHORIZED', 0)
  .setEnv('NODE_ENV', 'dev')

driver.BuildFluent()
  .Start()
  .UserSaysText('hallo!')
  .WaitBotSaysText((text) => assert('Text received, echo: hallo!', text))
  .Restart()
  .UserSaysText('Generic')
  .WaitBotSays((botMsg) => assert('First card', JSON.stringify(botMsg.sourceData)))
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
