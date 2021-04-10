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
    [Capabilities.CONTAINERMODE]: scriptedConnector(script),
    [Capabilities.SCRIPTING_XLSX_SHEETNAMES]: 'Convos',
    [Capabilities.SCRIPTING_XLSX_SHEETNAMES_PCONVOS]: 'PConvos',
    [Capabilities.SCRIPTING_ENABLE_MEMORY]: true
  }
  const driver = new BotDriver(myCaps)
  _this.compiler = driver.BuildCompiler()
  _this.compiler.ReadScriptsFromDirectory(path.resolve(__dirname, dir))
  _this.compiler.ExpandConvos()
  _this.container = await driver.Build()
}

describe('convo.partialconvo.usecases', function () {
  it('Depth1 txt, everything ok', async function () {
    await _initIt([
      'Password please!',
      'You are logged in!',
      'Are you sure?',
      'You are logged out!'
    ], 'convos/partialconvo/depth1', this)

    assert.equal(this.compiler.convos.length, 1)
    assert.equal(Object.keys(this.compiler.partialConvos).length, 2)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.lengthOf(transcript.steps, 8)
    assert.equal(transcript.steps[0].actual.sender, 'me')
    assert.equal(transcript.steps[0].actual.messageText, 'Login please')
    assert.equal(transcript.steps[1].actual.sender, 'bot')
    assert.equal(transcript.steps[1].actual.messageText, 'Password please!')
    assert.equal(transcript.steps[2].actual.sender, 'me')
    assert.equal(transcript.steps[2].actual.messageText, '123456')
    assert.equal(transcript.steps[3].actual.sender, 'bot')
    assert.equal(transcript.steps[3].actual.messageText, 'You are logged in!')
    assert.equal(transcript.steps[4].actual.sender, 'me')
    assert.equal(transcript.steps[4].actual.messageText, 'Logout please!')
    assert.equal(transcript.steps[5].actual.sender, 'bot')
    assert.equal(transcript.steps[5].actual.messageText, 'Are you sure?')
    assert.equal(transcript.steps[6].actual.sender, 'me')
    assert.equal(transcript.steps[6].actual.messageText, 'Yes')
    assert.equal(transcript.steps[7].actual.sender, 'bot')
    assert.equal(transcript.steps[7].actual.messageText, 'You are logged out!')
  })
  it('Depth1 xls, everything ok', async function () {
    await _initIt([
      'Password please!',
      'You are logged in!',
      'Are you sure?',
      'You are logged out!'
    ], 'convos/partialconvo/excel/convo', this)

    assert.equal(this.compiler.convos.length, 1)
    assert.equal(Object.keys(this.compiler.partialConvos).length, 2)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.lengthOf(transcript.steps, 8)
    assert.equal(transcript.steps[0].actual.sender, 'me')
    assert.equal(transcript.steps[0].actual.messageText, 'Login please')
    assert.equal(transcript.steps[1].actual.sender, 'bot')
    assert.equal(transcript.steps[1].actual.messageText, 'Password please!')
    assert.equal(transcript.steps[2].actual.sender, 'me')
    assert.equal(transcript.steps[2].actual.messageText, '123456')
    assert.equal(transcript.steps[3].actual.sender, 'bot')
    assert.equal(transcript.steps[3].actual.messageText, 'You are logged in!')
    assert.equal(transcript.steps[4].actual.sender, 'me')
    assert.equal(transcript.steps[4].actual.messageText, 'Logout please!')
    assert.equal(transcript.steps[5].actual.sender, 'bot')
    assert.equal(transcript.steps[5].actual.messageText, 'Are you sure?')
    assert.equal(transcript.steps[6].actual.sender, 'me')
    assert.equal(transcript.steps[6].actual.messageText, 'Yes')
    assert.equal(transcript.steps[7].actual.sender, 'bot')
    assert.equal(transcript.steps[7].actual.messageText, 'You are logged out!')
  })
  it('Depth1 csv, everything ok', async function () {
    await _initIt([
      'Password please!',
      'You are logged in!',
      'Are you sure?',
      'You are logged out!'
    ], 'convos/partialconvo/csv', this)

    assert.equal(this.compiler.convos.length, 1)
    assert.equal(Object.keys(this.compiler.partialConvos).length, 2)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.lengthOf(transcript.steps, 8)
    assert.equal(transcript.steps[0].actual.sender, 'me')
    assert.equal(transcript.steps[0].actual.messageText, 'Login please')
    assert.equal(transcript.steps[1].actual.sender, 'bot')
    assert.equal(transcript.steps[1].actual.messageText, 'Password please!')
    assert.equal(transcript.steps[2].actual.sender, 'me')
    assert.equal(transcript.steps[2].actual.messageText, '123456')
    assert.equal(transcript.steps[3].actual.sender, 'bot')
    assert.equal(transcript.steps[3].actual.messageText, 'You are logged in!')
    assert.equal(transcript.steps[4].actual.sender, 'me')
    assert.equal(transcript.steps[4].actual.messageText, 'Logout please!')
    assert.equal(transcript.steps[5].actual.sender, 'bot')
    assert.equal(transcript.steps[5].actual.messageText, 'Are you sure?')
    assert.equal(transcript.steps[6].actual.sender, 'me')
    assert.equal(transcript.steps[6].actual.messageText, 'Yes')
    assert.equal(transcript.steps[7].actual.sender, 'bot')
    assert.equal(transcript.steps[7].actual.messageText, 'You are logged out!')
  })
  it('Wrong botsays in main convo', async function () {
    await _initIt([
      'Password please!',
      'You are logged in ERROR!',
      'Are you sure?',
      'You are logged out!'
    ], 'convos/partialconvo/depth1', this)
    return assert.isRejected(this.compiler.convos[0].Run(this.container), 'Main/Line 10: Bot response (on Login/Line 8: #me - 123456) "You are logged in ERROR!" expected to match "You are logged in!"')
  })

  it('Wrong botsays in partial convo', async function () {
    await _initIt([
      'Password please!',
      'You are logged in!',
      'Are you sure ERROR?',
      'You are logged out!'
    ], 'convos/partialconvo/depth1', this)
    return assert.isRejected(this.compiler.convos[0].Run(this.container), 'Main/Logout/Line 5: Bot response (on Line 13: #me - Logout please! INCLUDE(Logout)) "Are you sure ERROR?" expected to match "Are you sure?"')
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

  it('It is possible to use #include in convo', async function () {
    await _initIt([
      'in depth2',
      'in depth1',
      'main end'
    ], 'convos/partialconvo/usesender', this)
    return assert.isFulfilled(this.compiler.convos[0].Run(this.container))
  })

  it('It is possible to use multiple #include in convo', async function () {
    await _initIt([
      'in sub!',
      'in sub!',
      'in sub!',
      'in sub!'
    ], 'convos/partialconvo/usesendermultiinclude', this)
    return assert.isFulfilled(this.compiler.convos[0].Run(this.container))
  })

  it('It is possible to use multiple #include in JSON convo', async function () {
    await _initIt([
      'in sub!',
      'in sub!'
    ], 'convos/partialconvo/usesendermultiincludejson', this)
    return assert.isFulfilled(this.compiler.convos[0].Run(this.container))
  })

  it('It is possible to use multiple #include in YAML convo', async function () {
    await _initIt([
      'in sub!',
      'in sub!'
    ], 'convos/partialconvo/usesendermultiincludeyaml', this)
    return assert.isFulfilled(this.compiler.convos[0].Run(this.container))
  })

  it('It is possible to use multiple #include in MD convo', async function () {
    await _initIt([
      'in sub!',
      'in sub!'
    ], 'convos/partialconvo/usesendermultiincludemd', this)
    return assert.isFulfilled(this.compiler.convos[0].Run(this.container))
  })

  it('It is possible to include more partial convos in one convostep', async function () {
    await _initIt([
      'in sub!',
      'in sub!'
    ], 'convos/partialconvo/includedmoretimes', this)
    return assert.isFulfilled(this.compiler.convos[0].Run(this.container))
  })

  it('has empty #me convo step in Excel', async function () {
    await _initIt([
      'Password please!',
      'You are logged in!',
      'Are you sure?',
      'You are logged out!'
    ], 'convos/partialconvo/excel/emptystep', this)

    assert.equal(this.compiler.convos.length, 2)
    assert.equal(Object.keys(this.compiler.partialConvos).length, 2)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.lengthOf(transcript.steps, 8)
    assert.equal(transcript.steps[0].actual.sender, 'me')
    assert.equal(transcript.steps[0].actual.messageText, 'Login please')
    assert.equal(transcript.steps[1].actual.sender, 'bot')
    assert.equal(transcript.steps[1].actual.messageText, 'Password please!')
    assert.equal(transcript.steps[2].actual.sender, 'me')
    assert.equal(transcript.steps[2].actual.messageText, '123456')
    assert.equal(transcript.steps[3].actual.sender, 'bot')
    assert.equal(transcript.steps[3].actual.messageText, 'You are logged in!')
    assert.equal(transcript.steps[4].actual.sender, 'me')
    assert.equal(transcript.steps[4].actual.messageText, 'Logout please!')
    assert.equal(transcript.steps[5].actual.sender, 'bot')
    assert.equal(transcript.steps[5].actual.messageText, 'Are you sure?')
    assert.equal(transcript.steps[6].actual.sender, 'me')
    assert.equal(transcript.steps[6].actual.messageText, 'Yes')
    assert.equal(transcript.steps[7].actual.sender, 'bot')
    assert.equal(transcript.steps[7].actual.messageText, 'You are logged out!')
  })

  it('has empty #bot convo step in Excel', async function () {
    await _initIt([
      'Password please!',
      'You are logged in!',
      'Are you sure?',
      'You are logged out!'
    ], 'convos/partialconvo/excel/emptystep', this)

    assert.equal(this.compiler.convos.length, 2)
    assert.equal(Object.keys(this.compiler.partialConvos).length, 2)

    const transcript = await this.compiler.convos[1].Run(this.container)
    assert.lengthOf(transcript.steps, 8)
  })

  it('has bot text in convo step in Excel', async function () {
    await _initIt([
      'Password please!',
      'You are logged in!'
    ], 'convos/partialconvo/excel/bottext', this)

    assert.equal(this.compiler.convos.length, 1)
    assert.equal(Object.keys(this.compiler.partialConvos).length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.lengthOf(transcript.steps, 4)
  })

  it('expands utterances in partial convos', async function () {
    await _initIt([], 'convos/partialconvo/withutterances', this)

    assert.equal(this.compiler.convos.length, 3)
    assert.equal(Object.keys(this.compiler.utterances).length, 1)
    assert.equal(Object.keys(this.compiler.partialConvos).length, 2)
    assert.equal(this.compiler.convos[0].conversation[7].messageText, 'yes')
    assert.equal(this.compiler.convos[1].conversation[7].messageText, 'sure')
    assert.equal(this.compiler.convos[2].conversation[7].messageText, 'do it')
  })

  it('uses scripting memory in partial convos', async function () {
    await _initIt([
      'Password please!',
      'You are logged in!',
      'Are you sure?',
      'You are logged out!'
    ], 'convos/partialconvo/withscriptingmemory', this)

    assert.equal(this.compiler.convos.length, 1)
    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.equal(transcript.steps[2].actual.messageText, '123456')
  })

  afterEach(async function () {
    this.container && await this.container.Clean()
  })
})

describe('convo.partialconvo.wrongconvos', function () {
  it('Circular', async function () {
    return assert.isRejected(_initIt([], 'convos/partialconvo/circular', this), 'Partial convos are included circular. "first" is referenced by "/" and by "/first/second"')
  })

  it('Partial convo without name', async function () {
    return assert.isRejected(_initIt([], 'convos/partialconvo/noname', this), 'Header name is mandatory: {"name":""}')
  })

  it('Partial convo not found', async function () {
    return assert.isRejected(_initIt([], 'convos/partialconvo/notfound', this), 'Cant find partial convo with name notexists (There are no partial convos)')
  })

  it('Partial convo wrong ref', async function () {
    return assert.isRejected(_initIt([], 'convos/partialconvo/wrongref', this), 'Cant find partial convo with name wrongref (available partial convos: exists)')
  })

  it('Partial convo name duplicated', async function () {
    return assert.isRejected(_initIt([], 'convos/partialconvo/duplicatepconvo', this), 'Duplicate partial convo: pconvo')
  })

  it('Wrong arguments', async function () {
    return assert.isRejected(_initIt([], 'convos/partialconvo/wrongarg', this), 'Wrong argument for include logic hook!')
  })

  it('Illegal partial convo name', async function () {
    return assert.isRejected(_initIt([], 'convos/partialconvo/illegalname', this), 'Invalid partial convo name: illegal|name')
  })

  afterEach(async function () {
    this.container && await this.container.Clean()
  })
})

describe('convo.partialconvo.decompile', function () {
  it('Depth1 txt, everything ok', async function () {
    await _initIt([
      'Password please!',
      'You are logged in!',
      'Are you sure?',
      'You are logged out!'
    ], 'convos/partialconvo/depth1', this)

    assert.equal(this.compiler.convos.length, 1)
    assert.equal(Object.keys(this.compiler.partialConvos).length, 2)

    const convoTxt = this.compiler.Decompile(this.compiler.convos, 'SCRIPTING_FORMAT_TXT')
    assert.equal(convoTxt, `Main

#begin

#me
Login please
INCLUDE Login

#bot
Password please!

#me
123456

#bot
You are logged in!

#me
Logout please!
INCLUDE Logout

#bot
Are you sure?

#me
Yes

#bot
You are logged out!

#end
`)
  })

  it('Depth1 excel, everything ok', async function () {
    await _initIt([
      'Password please!',
      'You are logged in!',
      'Are you sure?',
      'You are logged out!'
    ], 'convos/partialconvo/excel/convo', this)

    assert.equal(this.compiler.convos.length, 1)
    assert.equal(Object.keys(this.compiler.partialConvos).length, 2)

    const convoXslx = this.compiler.Decompile(this.compiler.convos, 'SCRIPTING_FORMAT_XSLX')

    this.compiler.convos = []
    this.compiler.partialConvos = {}
    this.compiler.Compile(convoXslx, 'SCRIPTING_FORMAT_XSLX', 'SCRIPTING_TYPE_CONVO')
    assert.equal(this.compiler.convos.length, 1)
  })
})
