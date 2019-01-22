const BotDriver = require('../../../index').BotDriver

const driver = new BotDriver()

driver.BuildFluent()
  .Start()
  .UserSaysText('Hello')
  .WaitBotSaysText(console.log)
  .UserSaysText('How are you ?')
  .WaitBotSaysText(console.log)
  .Stop()
  .Clean()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
