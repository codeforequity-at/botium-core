const BotDriver = require('../../index').BotDriver
const Capabilities = require('../../index').Capabilities
const Source = require('../../index').Source

const driver = new BotDriver()
  .setCapability(Capabilities.PROJECTNAME, 'core-CreateNewConversation')
  .setCapability(Capabilities.BOTFRAMEWORK_API, true)
  .setCapability(Capabilities.BOTFRAMEWORK_APP_ID, 'my microsoft app id')
  .setCapability(Capabilities.BOTFRAMEWORK_CHANNEL_ID, 'facebook')
  .setCapability(Capabilities.CLEANUPTEMPDIR, false)
  .setSource(Source.GITURL, 'https://github.com/Microsoft/BotBuilder-Samples.git')
  .setSource(Source.GITDIR, 'Node/cards-CarouselCards')
  .setSource(Source.GITPREPARECMD, 'npm install')
  .setCapability(Capabilities.STARTCMD, 'npm start')
  .setEnv('MICROSOFT_APP_ID', 'my microsoft app id')
  .setEnv('MICROSOFT_APP_PASSWORD', 'my microsoft app password')
  .setEnv('NODE_DEBUG', 'botbuilder')
  .setEnv('DEBUG', '*')

driver.BuildFluent()
  .Start()
  .UserSaysText('hi bot')
  .WaitBotSays((msg) => console.log(JSON.stringify(msg)))
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
