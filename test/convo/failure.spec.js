import path from 'path'
import { assert } from 'chai'
import { BotDriver, Capabilities } from '../../index.js'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const failingConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      setTimeout(() => queueBotSays(new Error('something failed')), 0)
    }
  }
}

describe('convo.failure', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'convo.failure',
      [Capabilities.CONTAINERMODE]: failingConnector
    }
    this.driver = new BotDriver(myCaps)
    this.compiler = this.driver.BuildCompiler()
    this.container = await this.driver.Build()
    await this.container.Start()
  })

  afterEach(async function () {
    await this.container.Stop()
    await this.container.Clean()
  })

  it('should fail', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), '1step.convo.txt')
    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('something failed') >= 0)
    }
  })
})
