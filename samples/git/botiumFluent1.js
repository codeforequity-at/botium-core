const BotDriver = require('../../index').BotDriver
const Capabilities = require('../../index').Capabilities
const Source = require('../../index').Source

const driver = new BotDriver()
  .setCapability(Capabilities.PROJECTNAME, 'messenger-platform-samples')
  .setCapability(Capabilities.FACEBOOK_API, true)
  .setCapability(Capabilities.FACEBOOK_WEBHOOK_PORT, 1337)
  .setCapability(Capabilities.FACEBOOK_WEBHOOK_PATH, 'webhook')
  .setSource(Source.GITURL, 'https://github.com/fbsamples/messenger-platform-samples.git')
  .setSource(Source.GITDIR, 'quick-start')
  .setSource(Source.GITPREPARECMD, 'npm install')
  .setCapability(Capabilities.STARTCMD, 'node app.js')
  .setEnv('NODE_TLS_REJECT_UNAUTHORIZED', 0)
  .setEnv('PAGE_ACCESS_TOKEN', 'sample')

driver.BuildFluent()
  .Start()
  .UserSaysText('start')
  .WaitBotSaysText((text) => console.log(text))
  .UserSays({ 
    sourceData: { 
      message: {
        mid: 'mid.1458696618141:b4ef9d19ec21086067',
        attachments: [
          {
            type: 'image',
            payload: {
              url: '<IMAGE_URL>'
            }
          }
        ]
      }
    }
  })
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
