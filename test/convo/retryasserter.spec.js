const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../..').BotDriver
const Capabilities = require('../..').Capabilities

const echoConnector = () => ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      queueBotSays(botMsg)
    }
  }
}
const assertConvoStep = (numErrors, errorText) => {
  let errors = 0
  return () => {
    if (errors >= numErrors) {
      return Promise.resolve()
    } else {
      errors++
      return Promise.reject(errorText)
    }
  }
}

const buildDriver = async (mergeCaps) => {
  const myCaps = Object.assign({
    [Capabilities.PROJECTNAME]: 'convo.retryasserters',
    [Capabilities.CONTAINERMODE]: echoConnector()
  }, mergeCaps)

  const result = {}
  result.driver = new BotDriver(myCaps)
  result.compiler = result.driver.BuildCompiler()
  result.container = await result.driver.Build()
  return result
}

describe('convo.retryasserters', function () {
  beforeEach(async function () {
    this.init = async (numErrors, errorText, errorPatterns, numRetries) => {
      const myCaps = {
        [Capabilities.ASSERTERS]: [{
          ref: 'CUSTOMASSERTER',
          src: {
            assertConvoStep: assertConvoStep(numErrors, errorText)
          }
        }],
        RETRY_ASSERTER_ONERROR_REGEXP: errorPatterns,
        RETRY_ASSERTER_MINTIMEOUT: 10
      }
      if (!isNaN(numRetries)) {
        myCaps.RETRY_ASSERTER_NUMRETRIES = numRetries
      }
      const { compiler, container } = await buildDriver(myCaps)
      this.compiler = compiler
      this.container = container
      await this.container.Start()
    }
  })
  afterEach(async function () {
    await this.container.Stop()
    await this.container.Clean()
  })

  it('should fail without retry', async function () {
    await this.init(1, 'myerror')

    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'retryasserter1step.convo.txt')
    try {
      await this.compiler.convos[0].Run(this.container)
    } catch (err) {
      assert.isTrue(err.message.indexOf('myerror') >= 0)
      return
    }
    assert.fail('should have failed without retry')
  })
  it('should succeed after one retry with default settings', async function () {
    await this.init(1, 'myerror', 'myerror')

    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'retryasserter1step.convo.txt')
    await this.compiler.convos[0].Run(this.container)
  })
  it('should fail after one retry with default settings', async function () {
    await this.init(2, 'myerror', 'myerror')

    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'retryasserter1step.convo.txt')
    try {
      await this.compiler.convos[0].Run(this.container)
    } catch (err) {
      assert.isTrue(err.message.indexOf('myerror') >= 0)
      return
    }
    assert.fail('should have failed after first retry')
  })
  it('should succeed after many retries', async function () {
    await this.init(5, 'myerror', 'myerror', 5)

    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'retryasserter1step.convo.txt')
    await this.compiler.convos[0].Run(this.container)
  })
  it('should succeed after too less retries', async function () {
    await this.init(5, 'myerror', 'myerror', 4)

    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'retryasserter1step.convo.txt')
    try {
      await this.compiler.convos[0].Run(this.container)
    } catch (err) {
      assert.isTrue(err.message.indexOf('myerror') >= 0)
      return
    }
    assert.fail('should have failed after four retries')
  })
  it('should succeed after one retry with regexp pattern', async function () {
    await this.init(1, 'myerror', /myeRRor/i)

    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'retryasserter1step.convo.txt')
    await this.compiler.convos[0].Run(this.container)
  })
  it('should fail after one retry with unmatched regexp pattern', async function () {
    await this.init(1, 'myerror', /myeRRor1/i)

    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'retryasserter1step.convo.txt')
    try {
      await this.compiler.convos[0].Run(this.container)
    } catch (err) {
      assert.isTrue(err.message.indexOf('myerror') >= 0)
      return
    }
    assert.fail('should have failed with unmatched retry pattern')
  })
  it('should succeed after one retry with regexp pattern array', async function () {
    await this.init(1, 'myerror', [/myeRRor/i, /myeRRor1/i])

    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'retryasserter1step.convo.txt')
    await this.compiler.convos[0].Run(this.container)
  })
  it('should fail after one retry with unmatched regexp pattern array', async function () {
    await this.init(1, 'myerror', [/myeRRor1/i, /myeRRor2/i])

    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'retryasserter1step.convo.txt')
    try {
      await this.compiler.convos[0].Run(this.container)
    } catch (err) {
      assert.isTrue(err.message.indexOf('myerror') >= 0)
      return
    }
    assert.fail('should have failed with unmatched retry pattern')
  })
})
