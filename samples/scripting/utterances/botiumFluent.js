const fs = require('fs')

const BotDriver = require('../../../index').BotDriver
const Capabilities = require('../../../index').Capabilities
const Source = require('../../../index').Source

console.log('Please make sure that botium-connector-dialogflow module is installed before running this sample')

const driver = new BotDriver()

if (!fs.existsSync('botium-utterances-master')) {
  console.log('Please download botium-utterances package from https://github.com/codeforequity-at/botium-utterances and unpack it here.')
  process.exit(1)
}

driver.BuildFluent()
  .ReadScripts('botium-utterances-master/shared', '**/+(INCOMPREHENSION.en.utterances.txt)')
  .ReadScripts('botium-utterances-master/convos/joke')
  .Call((f) => console.log('Convos read: ' + f.compiler.convos.length))
  .Call((f) => f.compiler.ExpandConvos())
  .Call((f) => console.log('Convos expanded: ' + f.compiler.convos.length))
  .Start()
  .RunScripts()
  .Stop()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
