const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities
const Source = require('../../').Source

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
  
console.log(driver)

driver.Build()
  .then((c) => c.Start())
  .then((c) => c.Stop())
  .then((c) => c.Clean())
  .catch((err) => {
    console.log('failed')
    console.log(err)
  })   
