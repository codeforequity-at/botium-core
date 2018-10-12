const BotDriver = require('../../index').BotDriver
const Capabilities = require('../../index').Capabilities

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
  .setCapability(Capabilities.SIMPLEREST_BUTTONS_JSONPATH, '$.quick_response.*')

driver.BuildFluent()
  .Start()
  .UserSaysText('Hallo')
  .WaitBotSays(console.log)
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
