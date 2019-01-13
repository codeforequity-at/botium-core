const fs = require('fs')
const path = require('path')
const BotDriver = require('../../../index').BotDriver

console.log('Please make sure that botium-connector-echo module is installed before running this sample')

const driver = new BotDriver()
  .setCapability('ASSERTERS', [
    {
      ref: 'INLINEASSERTER',
      src: () => ({
        assertConvoBegin: ({ convo, ...args }) => {
          console.log(`InlineAsserter assertConvoBegin: ${convo.header.name}`)
        },
        assertConvoStep: ({ ...args }) => {
          console.log(`InlineAsserter assertConvoStep ...`)
        },
        assertConvoEnd: ({ convo, ...args }) => {
          console.log(`InlineAsserter assertConvoEnd: ${convo.header.name}`)
        }
      })
    }
  ])
  .setCapability('LOGIC_HOOKS', [{
    ref: 'INLINEHOOK',
    src: class InlineHook {
      onMeStart ({ convoStep, ...args }) {
        console.log(`InlineHook onMeStart before sending text: ${convoStep.messageText}`)
      }
      onMeEnd ({ convoStep, ...args }) {
        console.log(`InlineHook onMeEnd after sending text: ${convoStep.messageText}`)
      }
      onBotStart ({ convoStep, ...args }) {
        console.log(`InlineHook onBotStart expecting text: ${convoStep.messageText}`)
      }
      onBotEnd ({ botMsg, ...args }) {
        console.log(`InlineHook onBotEnd got text: ${botMsg.messageText}`)
      }
    },
    global: true
  }])

const scriptBuffer = fs.readFileSync(path.join(__dirname, 'convos/echo.convo.txt'))

driver.BuildFluent()
  .Compile(scriptBuffer, 'SCRIPTING_FORMAT_TXT')
  .RunScripts()
  .Exec()
  .then(() => {
    console.log('SUCCESS :)')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
