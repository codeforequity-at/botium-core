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
  .setCapability(Capabilities.PROJECTNAME, 'Simple Rest Sample')
  .setCapability(Capabilities.CONTAINERMODE, 'simplerest')
  .setCapability(Capabilities.SIMPLEREST_INIT_CONTEXT, '{ "conversation_id": "none" }')
  .setCapability(Capabilities.SIMPLEREST_INIT_TEXT, 'Hallo')
  .setCapability(Capabilities.SIMPLEREST_URL, 'https://drei-chatapp-agent-website-tomcat-t.eu-de.mybluemix.net/api/v1/{{context.conversation_id}}/{{msg.messageText}}')
  .setCapability(Capabilities.SIMPLEREST_METHOD, 'GET')
  .setCapability(Capabilities.SIMPLEREST_HEADERS_TEMPLATE, '{ "apiToken": "testapitoken" }')
  .setCapability(Capabilities.SIMPLEREST_CONTEXT_JSONPATH, '$')
  .setCapability(Capabilities.SIMPLEREST_RESPONSE_JSONPATH, '$.text.*')

driver.BuildFluent()
  .Start()
//  .WaitBotSaysText((text) => assert('Hallo und willkommen', text))
  .UserSaysText('Was kann ich machen ?')
  .WaitBotSaysText((text) => assert('In der 3Kundenzone finden Sie Informationen zum Vertrag', text))
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
