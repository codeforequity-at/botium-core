const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities
const Source = require('../../').Source

const driver = new BotDriver()
  .setCapability(Capabilities.FACEBOOK_API, true)
  .setCapability(Capabilities.FACEBOOK_WEBHOOK_PORT, 5000)
  .setCapability(Capabilities.FACEBOOK_WEBHOOK_PATH, 'webhook')
  .setSource(Source.LOCALPATH, 'D:/networktunnel_portable/testmybot/samples/facebook')
  .setCapability(Capabilities.STARTCMD, 'npm install && node index.js')

console.log(driver)

driver.Build()
  .then((container) => {
    console.log('built ...')
    console.log(container)
  })
  .catch((err) => {
    console.log('failed')
    console.log(err)
  })
