const BotDriver = require('../../index').BotDriver
const Capabilities = require('../../index').Capabilities
const Source = require('../../index').Source

const driver = new BotDriver()
  .setCapability(Capabilities.PROJECTNAME, 'Oktocheck Harry Potter')
  .setCapability(Capabilities.CONTAINERMODE, 'fbdirect')
  .setCapability(Capabilities.FB_PAGEID, '1919178811662091')
  .setCapability(Capabilities.FB_USER, '')
  .setCapability(Capabilities.FB_PASSWORD, '')

driver.BuildFluent()
  .Start()
  .UserSaysText('suche Harry Potter')
  .WaitBotSays((msg) => console.log(msg))
  .WaitBotSays((msg) => console.log(msg))  
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
