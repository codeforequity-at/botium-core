import path from 'path'
import { assert } from 'chai'
import { BotDriver, Capabilities, TranscriptUtils } from '../../index.js'
import util from 'util'
import createDebug from 'debug'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const debug = createDebug('botium-test-transcriptutils')

const createEchoConnector = () => ({ queueBotSays, caps }) => {
  return {
    UserSays (msg) {
      const prefix = `Testcase "${caps[Capabilities.PROJECTNAME]}"`
      debug(`${prefix} Connector got message ${util.inspect(msg)}`)
      const botMsg = {
        sender: 'bot',
        sourceData: msg.sourceData,
        messageText: msg.messageText
      }
      setTimeout(() => {
        debug(`${prefix} Connector send message ${util.inspect(botMsg)}`)
        return queueBotSays(botMsg)
      }, caps.WAITECHO)
    }
  }
}

describe('helpers.transcriptutils', function () {
  describe('hasTimeout', function () {
    it('should return true ontimeout', async function () {
      const myCaps = {
        [Capabilities.PROJECTNAME]: 'helpers.transcriptutils.hasTimeout should should return true ontimeout',
        [Capabilities.CONTAINERMODE]: createEchoConnector(),
        [Capabilities.WAITFORBOTTIMEOUT]: 0,
        WAITECHO: 20
      }
      const driver = new BotDriver(myCaps)
      const compiler = driver.BuildCompiler()
      const container = await driver.Build()

      compiler.ReadScript(path.resolve(__dirname, 'convos'), 'hello.convo.txt')
      assert.equal(compiler.convos.length, 1)

      try {
        await compiler.convos[0].Run(container)
        assert.fail('should have failed with timeout')
      } catch (err) {
        if (!TranscriptUtils.hasWaitForBotTimeout(err)) {
          throw err
        }
      }
      await container.Clean()
    })

    it('should return false if there is no timeout', async function () {
      const myCaps = {
        [Capabilities.PROJECTNAME]: 'helpers.transcriptutils.hasTimeout should return false if there is no timeout',
        [Capabilities.CONTAINERMODE]: createEchoConnector(),
        [Capabilities.WAITFORBOTTIMEOUT]: 50,
        WAITECHO: 20
      }
      const driver = new BotDriver(myCaps)
      const compiler = driver.BuildCompiler()
      const container = await driver.Build()

      compiler.ReadScript(path.resolve(__dirname, 'convos'), 'hello.convo.txt')
      assert.equal(compiler.convos.length, 1)

      await compiler.convos[0].Run(container)
      await container.Clean()
    })
  })
})
