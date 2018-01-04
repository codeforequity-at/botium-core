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
  .setCapability(Capabilities.PROJECTNAME, 'Botkit Slack Sample')
  .setCapability(Capabilities.SLACK_API, true)
  .setCapability(Capabilities.SLACK_EVENT_PORT, 3000)
  .setCapability(Capabilities.SLACK_EVENT_PATH, 'slack/receive')
  .setCapability(Capabilities.SLACK_OAUTH_PORT, 3000)
  .setCapability(Capabilities.SLACK_OAUTH_PATH, 'oauth')
  .setCapability(Capabilities.CLEANUPTEMPDIR, false)
  .setSource(Source.GITURL, 'https://github.com/howdyai/botkit-starter-slack')
  .setSource(Source.GITPREPARECMD, 'npm install')
  .setCapability(Capabilities.STARTCMD, 'npm run start')
  .setEnv('NODE_TLS_REJECT_UNAUTHORIZED', 0)
  .setEnv('NODE_ENV', 'dev')
  .setEnv('DEBUG', '*')
  .setEnv('PORT', 3000)
  .setEnv('clientId', '159753246482.159685134291')
  .setEnv('clientSecret', 'b993ecebb034fe06bb05e2e31bc8f465')

driver.BuildFluent()
  .Start()
  .SwitchChannel('#private')
  .WaitBotSaysText((text) => assert('I am a bot that has just joined your team', text))
  .WaitBotSaysText((text) => assert('You must now /invite me to a channel so that I can be of use!', text))
  .SwitchChannel('#general')
  .UserSaysText('@botiumbot add task reminder!!!!')
  .WaitBotSaysText((text) => assert(':thumbsup:', text))
  .SwitchChannel('#private')
  .UserSaysText('tasks')
  .WaitBotSaysText((text) => assert('Here are your current tasks:', text))
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
