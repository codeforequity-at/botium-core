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

describe('matching.matchingmode.general', function () {
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

  it('should match JSON response with messageText and a string', async function () {
    assert.isTrue(this.compiler.Match({ messageText: 123 }, '123'))
  })

  it('should match JSON response with toString', async function () {
    assert.isTrue(this.compiler.Match({ somethingElse: '123' }, '"somethingElse":"123"'))
  })
})

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
  it('should match case sensitive response', async function () {
    assert.isTrue(this.compiler.Match('This is a long text', 'This .*'))
  })
  it('should not match uppercase response', async function () {
    assert.isFalse(this.compiler.Match('THIS is a long text', 'This .*'))
  })
})

describe('matching.matchingmode.regexpIgnoreCase', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'matching.matchingmode',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_MATCHING_MODE]: 'regexpIgnoreCase'
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
  it('should match case sensitive response', async function () {
    assert.isTrue(this.compiler.Match('This is a long text', 'This .*'))
  })
  it('should match uppercase response', async function () {
    assert.isTrue(this.compiler.Match('THIS is a long text', 'This .*'))
  })
  it('should not match if pattern is not matching', async function () {
    assert.isFalse(this.compiler.Match('This is a long text', 'notthere .*'))
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

  it('should match case sensitive response', async function () {
    assert.isTrue(this.compiler.Match('This is a long text', 'is a'))
  })
  it('should not match uppercase response', async function () {
    assert.isFalse(this.compiler.Match('This is a long text', 'IS A'))
  })
  it('should not match if pattern is not matching', async function () {
    assert.isFalse(this.compiler.Match('This is a long text', 'notthere'))
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

  it('should match response with substring', async function () {
    assert.isTrue(this.compiler.Match('Interesting...', 'Interesting'))
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
  it('should not allow more than 10 wildcards in a string', async function () {
    try {
      this.compiler.Match('some text', 'begin * * * * * * * * * * * end')
      assert.fail('should have failed')
    } catch (err) {
      assert.equal(err.message, 'Maximum number of 10 wildcards supported.')
    }
  })
  it('should not match if pattern is not matching', async function () {
    assert.isFalse(this.compiler.Match('This is a long text', '*notthere*'))
  })
})

describe('matching.matchingmode.wildcardIgnoreCase', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'matching.matchingmode',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_MATCHING_MODE]: 'wildcardIgnoreCase'
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should match response with substring', async function () {
    assert.isTrue(this.compiler.Match('You said: So.....', 'so...'))
  })
  it('should match long response with wildcard', async function () {
    assert.isTrue(this.compiler.Match('this is a long text', 'this is a * text'))
  })
  it('should match long uppcercase response with wildcard', async function () {
    assert.isTrue(this.compiler.Match('THIS IS A LONG TEXT', 'this is a * text'))
  })
  it('should not match if pattern is not matching', async function () {
    assert.isFalse(this.compiler.Match('This is a long text', '*notthere*'))
  })
  it('should match response with utterances list', async function () {
    this.compiler.scriptingEvents.assertBotResponse('So.....', [
      'lol',
      'okay',
      'so...',
      'go on',
      'umm',
      'interesting',
      'really?'
    ], 'test')
  })
})

describe('matching.matchingmode.wildcardExact', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'matching.matchingmode',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_MATCHING_MODE]: 'wildcardExact'
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should not match response with substring', async function () {
    assert.isFalse(this.compiler.Match('Interesting...', 'Interesting'))
  })
  it('should match long response with wildcard', async function () {
    assert.isTrue(this.compiler.Match('this is a long text', 'this is a * text'))
  })
  it('should match very long response with wildcard', async function () {
    assert.isTrue(this.compiler.Match('this is a long text this is a long text this is a long text this is a long text', 'this is a * text this is a * text this is a * text this is a * text'))
  })
  it('should not match long uppcercase response with wildcard', async function () {
    assert.isFalse(this.compiler.Match('THIS IS A LONG TEXT', 'this is a * text'))
  })
  it('should match very long response with very long wildcard', async function () {
    assert.isTrue(this.compiler.Match('begin this is a long text this is a long text this is a long text this is a long text end', 'begin * end'))
  })
  it('should not allow more than 10 wildcards in a string', async function () {
    try {
      this.compiler.Match('some text', 'begin * * * * * * * * * * * end')
      assert.fail('should have failed')
    } catch (err) {
      assert.equal(err.message, 'Maximum number of 10 wildcards supported.')
    }
  })
  it('should not match if pattern is not matching', async function () {
    assert.isFalse(this.compiler.Match('This is a long text', '*notthere*'))
  })
})

describe('matching.matchingmode.equals', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'matching.matchingmode',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_MATCHING_MODE]: 'equals'
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should match case sensitive response', async function () {
    assert.isTrue(this.compiler.Match('This is a long text', 'This is a long text'))
  })
  it('should not match uppercase response', async function () {
    assert.isFalse(this.compiler.Match('This is a long text', 'THIS is a long text'))
  })
  it('should not match for partial match', async function () {
    assert.isFalse(this.compiler.Match('This is a long text', 'long'))
  })
})

describe('matching.matchingmode.equalsIgnorcase', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'matching.matchingmode',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_MATCHING_MODE]: 'equalsIgnoreCase'
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should match case sensitive response', async function () {
    assert.isTrue(this.compiler.Match('This is a long text', 'This is a long text'))
  })
  it('should match uppercase response', async function () {
    assert.isTrue(this.compiler.Match('This is a long text', 'THIS is a long text'))
  })
  it('should not match for partial match', async function () {
    assert.isFalse(this.compiler.Match('This is a long text', 'long'))
  })
})
