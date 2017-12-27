const BotDriver = require('../../index').BotDriver
const Capabilities = require('../../index').Capabilities
const Source = require('../../index').Source

const driver = new BotDriver()
  .setCapability(Capabilities.PROJECTNAME, 'Botium Facebook Sample 1')
  .setCapability(Capabilities.FACEBOOK_API, true)
  .setCapability(Capabilities.FACEBOOK_WEBHOOK_PORT, 5000)
  .setCapability(Capabilities.FACEBOOK_WEBHOOK_PATH, 'webhook')
  .setCapability(Capabilities.CLEANUPTEMPDIR, false)
  .setSource(Source.LOCALPATH, '.')
  .setCapability(Capabilities.STARTCMD, 'npm install && node index.js')
  .setEnv('NODE_TLS_REJECT_UNAUTHORIZED', 0)
  .setEnv('NODE_ENV', 'dev')

let container = null

driver.Build()
  .then((c) => {
    container = c
  })
  .then(() => container.Start())
  .then(() => container.UserSaysText('hallo!'))
  .then(() => container.WaitBotSaysText())
  .then((text) => {
    if (text !== 'Text received, echo: hallo!') {
      throw new Error('Expected echo');
    }
  })
  .then(() => container.Stop())
  .then(() => container.Start())
  .then(() => container.UserSaysText('Generic'))
  .then(() => container.WaitBotSays())
  .then((botMsg) => {
    console.log(JSON.stringify(botMsg.sourceData, null, 2))
    return container
  })
  .catch((err) => {
    console.log('tests failed')
    console.log(err)
  })   
  .then(() => container.Stop())
  .then(() => container.Clean())
  .catch((err) => {
    console.log('cleanup failed')
    console.log(err)
  })   
