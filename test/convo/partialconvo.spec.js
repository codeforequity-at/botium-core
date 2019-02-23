const path = require('path')
const chai = require('chai')
const assert = chai.assert
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities

const scriptedConnector = (script) => ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      this.counter = this.counter >= 0 ? this.counter + 1 : 0
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: script[this.counter] }
      queueBotSays(botMsg)
    }
  }
}
const _initIt = async (script, dir, _this) => {
  const myCaps = {
    [Capabilities.PROJECTNAME]: 'convo.partialconvo',
    [Capabilities.CONTAINERMODE]: scriptedConnector(script)
  }
  const driver = new BotDriver(myCaps)
  _this.compiler = driver.BuildCompiler()
  _this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, dir))
  _this.container = await driver.Build()
}

describe('convo.partialconvo.usecases', function () {
  it('Depth1, everything ok', async function () {
    await _initIt([
      'Password please!',
      'You are logged in!',
      'Are you sure?',
      'You are logged out!'
    ], 'convos/partialconvo/depth1', this)

    assert.equal(this.compiler.convos.length, 1)
    assert.equal(Object.keys(this.compiler.partialConvos).length, 2)

    const result = await this.compiler.convos[0].Run(this.container)

    console.log(result)
  })

  it('Wrong botsays in main convo', async function () {
    await _initIt([
      'Password please!',
      'You are logged in ERROR!',
      'Are you sure?',
      'You are logged out!'
    ], 'convos/partialconvo/depth1', this)
    return assert.isRejected(this.compiler.convos[0].Run(this.container), 'Error: Main/Line 10: Expected bot response (on Login/Line 8: #me - 123456) "You are logged in ERROR!" to match one of "You are logged in!"')
  })

  it('Wrong botsays in partial convo', async function () {
    await _initIt([
      'Password please!',
      'You are logged in!',
      'Are you sure ERROR?',
      'You are logged out!'
    ], 'convos/partialconvo/depth1', this)
    return assert.isRejected(this.compiler.convos[0].Run(this.container), 'Error: Main/Logout/Line 5: Expected bot response (on Line 13: #me - Logout please! INCLUDE(Logout)) "Are you sure ERROR?" to match one of "Are you sure?"')
  })

  it('Depth is 2', async function () {
    await _initIt([
      'in depth1',
      'in depth2',
      'main end'
    ], 'convos/partialconvo/depth2', this)
    return assert.isFulfilled(this.compiler.convos[0].Run(this.container))
  })

  it('Included after bot', async function () {
    await _initIt([
      'ok',
      'included afterbot!'
    ], 'convos/partialconvo/includeafterbot', this)
    return assert.isFulfilled(this.compiler.convos[0].Run(this.container))
  })

  it('Included more times', async function () {
    await _initIt([
      'in sub!',
      'in sub!'
    ], 'convos/partialconvo/includedmoretimes', this)
    return assert.isFulfilled(this.compiler.convos[0].Run(this.container))
  })

  it('It is possible to include a partial convo first', async function () {
    await _initIt([
      'in depth2',
      'in depth1',
      'main end'
    ], 'convos/partialconvo/includefirst', this)
    return assert.isFulfilled(this.compiler.convos[0].Run(this.container))
  })

  it('It is possible to include more partial convos in one convostep', async function () {
    await _initIt([
      'in sub!',
      'in sub!'
    ], 'convos/partialconvo/includedmoretimes', this)
    return assert.isFulfilled(this.compiler.convos[0].Run(this.container))
  })

  afterEach(async function () {
    this.container && await this.container.Clean()
  })
})

describe('convo.partialconvo.wrongconvos', function () {
  it('Circular', async function () {
    await _initIt([], 'convos/partialconvo/circular', this)
    return assert.isRejected(this.compiler.convos[0].Run(this.container), 'Error: Partial convos are included circular. "first" is referenced by "/" and by "/first/second"')
  })

  it('Partial convo without name', async function () {
    return assert.isRejected(_initIt([], 'convos/partialconvo/noname', this), 'Invalid convo header: undefined undefined')
  })

  it('Partial convo not found', async function () {
    await _initIt([], 'convos/partialconvo/notfound', this)
    return assert.isRejected(this.compiler.convos[0].Run(this.container), 'Error: Cant find partial convo with name notexists')
  })

  it('Partial convo name duplicated', async function () {
    return assert.isRejected(_initIt([], 'convos/partialconvo/duplicatepconvo', this), 'Duplicate partial convo: pconvo')
  })

  it('Wrong arguments', async function () {
    await _initIt([], 'convos/partialconvo/wrongarg', this)
    return assert.isRejected(this.compiler.convos[0].Run(this.container), 'Error: Wrong argument for include logic hook!')
  })

  it('Illegal partial convo name', async function () {
    return assert.isRejected(_initIt([], 'convos/partialconvo/illegalname', this), 'Invalid partial convo name: illegal|name')
  })

  afterEach(async function () {
    this.container && await this.container.Clean()
  })
})
