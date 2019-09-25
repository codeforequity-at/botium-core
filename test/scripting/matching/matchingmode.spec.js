const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../../').BotDriver
const Capabilities = require('../../../').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: `You said: ${msg.messageText}` }
      queueBotSays(botMsg)
    }
  }
}

describe('matching.matchingmode.regexp', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'matching.matchingmode',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_MATCHING_MODE]: 'regexp'
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should check matching with regex', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'regex.convo.txt')
    await this.compiler.convos[0].Run(this.container)
  })
})

describe('matching.matchingmode.include', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'matching.matchingmode',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_MATCHING_MODE]: 'include'
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should match int response with string', async function () {
    assert.isTrue(this.compiler.Match(123, '123'))
  })

  it('should match JSON response with string', async function () {
    assert.isTrue(this.compiler.Match({ myvalue: 123 }, '123'))
  })
})

describe('matching.matchingmode.wildcard', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'matching.matchingmode',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_MATCHING_MODE]: 'wildcard'
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should match long response with wildcard', async function () {
    assert.isTrue(this.compiler.Match('this is a long text', 'this is a * text'))
  })
  it('should match very long response with wildcard', async function () {
    assert.isTrue(this.compiler.Match('this is a long text this is a long text this is a long text this is a long text', 'this is a * text this is a * text this is a * text'))
  })
  it('should not match long uppcercase response with wildcard', async function () {
    assert.isFalse(this.compiler.Match('THIS IS A LONG TEXT', 'this is a * text'))
  })
  it('should match very long response with very long wildcard', async function () {
    assert.isTrue(this.compiler.Match('begin this is a long text this is a long text this is a long text this is a long text end', 'begin * end'))
  })
})

describe('matching.matchingmode.wildcardLowerCase', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'matching.matchingmode',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_MATCHING_MODE]: 'wildcardLowerCase'
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should match long response with wildcard', async function () {
    assert.isTrue(this.compiler.Match('this is a long text', 'this is a * text'))
  })
  it('should match long uppcercase response with wildcard', async function () {
    assert.isTrue(this.compiler.Match('THIS IS A LONG TEXT', 'this is a * text'))
  })
})
