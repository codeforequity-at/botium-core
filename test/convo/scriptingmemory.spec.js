const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities
const ScriptingProvider = require('../../src/scripting/ScriptingProvider')
const { Convo } = require('../../src/scripting/Convo')
const DefaultCapabilities = require('../../src/Defaults').Capabilities
const ScriptingMemory = require('../../src/scripting/ScriptingMemory')

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      queueBotSays(botMsg)
    }
  }
}

describe('convo.scriptingmemory.convos', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'convo.scriptingmemory',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true
    }
    const driver = new BotDriver(myCaps)
    this.compiler = driver.BuildCompiler()
    this.container = await driver.Build()
  })
  afterEach(async function () {
    this.container && await this.container.Clean()
  })

  it('should fill scripting memory from convo file', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'memory.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory['$myvar'])
    assert.equal(transcript.scriptingMemory['$myvar'], 'VARVALUE')
  })
  it('should fill scripting memory from utterances file', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'utt_memory.convo.txt')
    assert.equal(this.compiler.convos.length, 1)
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'utt_memory.utterances.txt')
    assert.isDefined(this.compiler.utterances['AGE_UTT'])

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.equal(transcript.scriptingMemory['$years'], '40')
    assert.equal(transcript.scriptingMemory['$months'], '2')
  })
  it('should fail on invalid scripting memory', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'memory_fail.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected convo to fail')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Expected bot response (on Line 9: #me - show var VARVALUE) "show var VARVALUE" to match one of "show var VARVALUEINVALID"') > 0)
    }
  })
})

describe('convo.scriptingMemory.api', function () {
  describe('convo.scriptingMemory.api.fill', function () {
    beforeEach(async function () {
      this.containerStub = {
        caps: {
          [Capabilities.SCRIPTING_ENABLE_MEMORY]: true
        }
      }
      this.scriptingProvider = new ScriptingProvider(DefaultCapabilities)
      await this.scriptingProvider.Build()
      this.scriptingContext = this.scriptingProvider._buildScriptContext()
      this.convo = new Convo(this.scriptingContext, {
        header: 'test convo',
        conversation: []
      })
      this.scriptingProvider.AddConvos(this.convo)
    })

    it('should fill scripting memory from text', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'test sentence 1', 'test sentence $num', this.convo.scriptingEvents)
      assert.equal(scriptingMemory['$num'], '1')
    })
    it('should not fill scripting memory from invalid text', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'test sentence', 'test sentence $num', this.convo.scriptingEvents)
      assert.isUndefined(scriptingMemory['$num'])
    })
    it('should fill scripting memory from one utterance', async function () {
      this.scriptingProvider.AddUtterances({
        name: 'utt1',
        utterances: ['test sentence $num']
      })

      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'test sentence 1', 'utt1', this.convo.scriptingEvents)
      assert.equal(scriptingMemory['$num'], '1')
    })
    it('should fill multiple scripting memory from one utterance', async function () {
      this.scriptingProvider.AddUtterances({
        name: 'utt1',
        utterances: ['test sentence $num1 $num2']
      })

      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'test sentence 1 2', 'utt1', this.convo.scriptingEvents)
      assert.equal(scriptingMemory['$num1'], '1')
      assert.equal(scriptingMemory['$num2'], '2')
    })
    it('should fill scripting memory from two different utterances', async function () {
      this.scriptingProvider.AddUtterances({
        name: 'utt1',
        utterances: ['i am $months months old', 'i am $years years old']
      })

      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'i am 2 months old', 'utt1', this.convo.scriptingEvents)
      assert.equal(scriptingMemory['$months'], '2')
      assert.isUndefined(scriptingMemory['$years'])
    })
    it('should replace utterances from scripting memory', async function () {
      // $Years instead of $years to avoid collision with $year embedded variable
      this.scriptingProvider.AddUtterances({
        name: 'utt1',
        utterances: ['i am $months months old', 'i am $Years years old']
      })
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'i am 2 months old', 'utt1', this.convo.scriptingEvents)

      const tomatch = this.convo._resolveUtterancesToMatch(this.containerStub, scriptingMemory, 'utt1')
      assert.isArray(tomatch)
      assert.equal(tomatch[0], 'i am 2 months old')
      assert.equal(tomatch[1], 'i am $Years years old')
    })
    it('should accept special regexp characters in utterance when replace utterances from scripting memory in regexp matching mode', async function () {
      this.containerStub.caps[Capabilities.SCRIPTING_MATCHING_MODE] = 'regexp'

      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, '*test sentence 1*', '.* sentence $num', this.convo.scriptingEvents)
      assert.equal(scriptingMemory['$num'], '1')
      const tomatch = this.convo._resolveUtterancesToMatch(this.containerStub, scriptingMemory, '.* sentence $num')
      assert.isArray(tomatch)
      assert.equal(tomatch[0], '.* sentence 1')
    })
    it('should accept special regexp characters in utterances when replace utterances from scripting memory in regexp matching mode', async function () {
      this.containerStub.caps[Capabilities.SCRIPTING_MATCHING_MODE] = 'regexp'
      this.scriptingProvider.AddUtterances({
        name: 'utt1',
        utterances: ['.* sentence $num']
      })

      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, '*test sentence 1*', 'utt1', this.convo.scriptingEvents)
      assert.equal(scriptingMemory['$num'], '1')
      const tomatch = this.convo._resolveUtterancesToMatch(this.containerStub, scriptingMemory, 'utt1')
      assert.isArray(tomatch)
      assert.equal(tomatch[0], '.* sentence 1')
    })
    it('should accept special regexp characters in utterance when filling scripting memory', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, '*test sentence 1*', '*test sentence $num*', this.convo.scriptingEvents)
      assert.equal(scriptingMemory['$num'], '1')

      const scriptingMemory1 = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory1, 'Hier sind deine Erinnerungen: Notiz: 104 | This is a test reminder', 'Hier sind deine Erinnerungen: Notiz: $id | This is a test reminder', this.convo.scriptingEvents)
      assert.equal(scriptingMemory1['$id'], '104')
    })
    it('should accept special regexp characters in utterances when filling scripting memory', async function () {
      this.scriptingProvider.AddUtterances({
        name: 'utt1',
        utterances: ['[\'I am $months months old.\']', '[\'I am $years years old.\']']
      })
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, '[\'I am 2 years old.\']', 'utt1', this.convo.scriptingEvents)
      assert.equal(scriptingMemory['$years'], '2')
    })
    it('should accept newline characters in utterances when filling scripting memory', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'test sentence header\n\ntest sentence 1', 'test sentence header\n\ntest sentence $num', this.convo.scriptingEvents)
      assert.equal(scriptingMemory['$num'], '1')
    })
    it('should accept variable name case sensitive', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'test sentence 1', 'test sentence $Num', this.convo.scriptingEvents)
      assert.equal(scriptingMemory['$num'], undefined)
      assert.equal(scriptingMemory['$Num'], '1')
    })
    it('should accept variable name as postfix', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'test sentence a1', 'test sentence a$Num', this.convo.scriptingEvents)
      assert.equal(scriptingMemory['$num'], undefined)
      assert.equal(scriptingMemory['$Num'], '1')
    })
  })

  describe('convo.scriptingMemory.api.apply', function () {
    it('should apply on exact match', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { '$num': 1 },
        'test sentence $num'
      )
      assert.equal(result, 'test sentence 1')
    })

    it('should apply on prefix match', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { '$num': 1 },
        'test sentence $numPc'
      )
      assert.equal(result, 'test sentence 1Pc')
    })

    it('should apply on postfix match', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { '$num': 1 },
        'test sentence Number$num'
      )
      assert.equal(result, 'test sentence Number1')
    })

    it('should apply on middle match', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { '$num': 1 },
        'test sentence Number$numPc'
      )
      assert.equal(result, 'test sentence Number1Pc')
    })

    it('should not apply if name is wrong', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { '$um': 1 },
        'test sentence $num'
      )
      assert.equal(result, 'test sentence $num')
    })

    it('should not be confused on overlapping names 1', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { '$num': '1', '$number': '2' },
        'test sentence $num $number'
      )
      assert.equal(result, 'test sentence 1 2')
    })

    it('should not be confused on overlapping names 2', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { '$number': '2', '$num': '1' },
        'test sentence $num $number'
      )
      assert.equal(result, 'test sentence 1 2')
    })

    it('scripting memory functions', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { },
        '$year'
      )

      const year = parseInt(result)
      assert(year >= 2019 && year <= 2219, '$year invalid')
    })
  })

  describe('convo.scriptingMemory.api.applyToArgs', function () {
    it('exchange var with real value', async function () {
      let asserter = {
        'name': 'DUMMY',
        'args': [
          'dbUrl',
          '$count',
          'INSERT INTO dummy(name, birthday) VALUES (\'Max Mustermann\', 1991-03-26);'
        ]
      }
      let scriptingMemory = {
        '$count': '5'
      }
      assert.equal(ScriptingMemory.applyToArgs(asserter.args, scriptingMemory)[1], 5)
    })
    it('typo of reference', async function () {
      let asserter = {
        'name': 'DUMMY',
        'args': [
          'dbUrl',
          '$ount',
          'INSERT INTO dummy(name, birthday) VALUES (\'Max Mustermann\', 1991-03-26);'
        ]
      }
      let scriptingMemory = {
        '$count': '5'
      }
      assert.notEqual(ScriptingMemory.applyToArgs(asserter.args, scriptingMemory)[1], 5)
    })
    it('as postfix', async function () {
      let asserter = {
        'name': 'DUMMY',
        'args': [
          'dbUrl',
          'prefix$count',
          'INSERT INTO dummy(name, birthday) VALUES (\'Max Mustermann\', 1991-03-26);'
        ]
      }
      let scriptingMemory = {
        '$count': '5'
      }
      assert.equal(ScriptingMemory.applyToArgs(asserter.args, scriptingMemory)[1], 'prefix5')
    })
    it('as prefix', async function () {
      let asserter = {
        'name': 'DUMMY',
        'args': [
          'dbUrl',
          '$counter',
          'INSERT INTO dummy(name, birthday) VALUES (\'Max Mustermann\', 1991-03-26);'
        ]
      }
      let scriptingMemory = {
        '$count': '5'
      }
      assert.equal(ScriptingMemory.applyToArgs(asserter.args, scriptingMemory)[1], '5er')
    })
    it('different value', async function () {
      let asserter = {
        'name': 'DUMMY',
        'args': [
          'dbUrl',
          '$count',
          'INSERT INTO dummy(name, birthday) VALUES (\'Max Mustermann\', 1991-03-26);'
        ]
      }
      let scriptingMemory = {
        '$count': '4'
      }
      assert.notEqual(ScriptingMemory.applyToArgs(asserter.args, scriptingMemory)[1], 5)
    })

    it('different value', async function () {
      let asserter = {
        'name': 'DUMMY',
        'args': [
          'dbUrl',
          '$count',
          'INSERT INTO dummy(name, birthday) VALUES (\'Max Mustermann\', 1991-03-26);'
        ]
      }
      let scriptingMemory = {
        '$count': '4'
      }
      assert.notEqual(ScriptingMemory.applyToArgs(asserter.args, scriptingMemory)[1], 5)
    })

    it('scripting memory functions', async function () {
      let asserter = {
        'name': 'DUMMY',
        'args': [
          'dbUrl',
          '$year',
          'INSERT INTO dummy(name, birthday) VALUES (\'Max Mustermann\', 1991-03-26);'
        ]
      }
      let scriptingMemory = {}

      const year = ScriptingMemory.applyToArgs(asserter.args, scriptingMemory)[1]
      assert(year >= 2019 && year <= 2219, '$year invalid')
    })
  })

  // if a function is working with apply, then it has to work with applyToArgs too
  describe('convo.scriptingMemory.api.functions', function () {
    it('now', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { },
        '$now'
      )

      assert.equal(result, new Date().toLocaleString())
    })

    it('date', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { },
        '$date'
      )

      assert.equal(result, new Date().toLocaleDateString())
    })

    it('year', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { },
        '$year'
      )

      const year = parseInt(result)
      assert(year >= 2019 && year <= 2219, '$year invalid')
    })

    it('month', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { },
        '$month'
      )

      assert(result.length >= 2 && result.length <= 10, '$month invalid')
    })

    it('day_of_month', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { },
        '$day_of_month'
      )

      const dayOfMonth = parseInt(result)
      assert(dayOfMonth >= 1 && dayOfMonth <= 35, 'day_of_month invalid')
    })

    it('day_of_week', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { },
        '$day_of_week'
      )

      assert(result.length >= 2 && result.length <= 20, '$day_of_week invalid')
    })

    it('', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { },
        '$now_ISO'
      )

      assert(result.length === 24, '$now_ISO invalid')
    })
  })

  it('time', async function () {
    const result = ScriptingMemory.apply(
      { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
      { },
      '$time'
    )

    assert(result.length >= 5 && result.length <= 10, '$time invalid')
  })

  it('random10', async function () {
    const result = ScriptingMemory.apply(
      { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
      { },
      '$random10'
    )

    assert(result.length === 10, '$random10 invalid')
  })

  it('$uniqid', async function () {
    const result = ScriptingMemory.apply(
      { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
      { },
      '$uniqid'
    )

    assert(result.length === 36, '$uniqid invalid')
  })
})
