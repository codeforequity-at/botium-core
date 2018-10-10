const BotDriver = require('../../index').BotDriver
const Events = require('../../index').Events

const driver = new BotDriver()
driver.on(Events.MESSAGE_SENTTOBOT, (container, msg) => {
  console.log('me: ' + msg.messageText)
})
const botSaysText = (t) => {
  console.log('bot: ' + t)
}

driver.BuildFluent()
  .Start()
  .UserSaysText('hello')
  .WaitBotSaysText(botSaysText)
  .UserSaysText('great')
  .WaitBotSaysText(botSaysText)
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
