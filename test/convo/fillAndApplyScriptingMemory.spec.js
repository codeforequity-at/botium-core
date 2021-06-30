const path = require('path')
const assert = require('chai').assert
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities
const ScriptingProvider = require('../../src/scripting/ScriptingProvider')
const { Convo } = require('../../src/scripting/Convo')
const { normalizeText } = require('../../src/scripting/helper')
const DefaultCapabilities = require('../../src/Defaults').Capabilities
const ScriptingMemory = require('../../src/scripting/ScriptingMemory')

const CAPS_BASE = {
  [Capabilities.SECURITY_ALLOW_UNSAFE]: true
}
const CAPS_ENABLE_SCRIPTING_MEMORY = {
  [Capabilities.SECURITY_ALLOW_UNSAFE]: true,
  [Capabilities.SCRIPTING_ENABLE_MEMORY]: true
}
const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      queueBotSays(botMsg)
    }
  }
}

it('scripting memory function as asserter', async function () {
  const myCaps = {
    [Capabilities.PROJECTNAME]: 'convo.scriptingmemory',
    [Capabilities.CONTAINERMODE]: ({ queueBotSays }) => {
      return {
        UserSays (msg) {
          const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: new Date().toLocaleDateString() }
          queueBotSays(botMsg)
        }
      }
    },
    [Capabilities.SCRIPTING_ENABLE_MEMORY]: true
  }
  const driver = new BotDriver(myCaps)
  const compiler = driver.BuildCompiler()
  const container = await driver.Build()

  compiler.ReadScript(path.resolve(__dirname, 'convos'), 'assert_date.convo.txt')
  assert.equal(compiler.convos.length, 1)
  await compiler.convos[0].Run(container)

  container && await container.Clean()
})

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
    assert.isDefined(transcript.scriptingMemory.$myvar)
    assert.equal(transcript.scriptingMemory.$myvar, 'VARVALUE')
  })
  it('should fill scripting memory from utterances file', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'utt_memory.convo.txt')
    assert.equal(this.compiler.convos.length, 1)
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'utt_memory.utterances.txt')
    assert.isDefined(this.compiler.utterances.AGE_UTT)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.equal(transcript.scriptingMemory.$years, '40')
    assert.equal(transcript.scriptingMemory.$months, '2')
  })
  it('should fail on invalid scripting memory', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'memory_fail.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected convo to fail')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Bot response (on Line 9: #me - show var $myvar) "show var VARVALUE" expected to match "show var VARVALUEINVALID"') > 0)
    }
  })
  it('should normalize bot response', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'memory_normalize.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory.$state)
    assert.equal(transcript.scriptingMemory.$state, 'Kentucky')
  })
  it('should normalize bot response', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'memory_dont_override_functions.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isObject(transcript.scriptingMemory)
    assert.isUndefined(transcript.scriptingMemory.$year)
  })
  it('should append multiline messages from scripting memory', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'multiline.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert(transcript.steps[0].actual.messageText.split('\n')[1].startsWith('20'))
    assert(transcript.steps[1].actual.messageText.split('\n')[1].startsWith('20'))
    assert.isObject(transcript.scriptingMemory)
    assert.isDefined(transcript.scriptingMemory.$year_captured)
    assert.equal(transcript.scriptingMemory.$year_captured.length, 4)
  })
})

describe('convo.scriptingMemory.args', function () {
  it('should apply scripting memory to asserter args', async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'convo.scriptingmemory',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
      [Capabilities.ASSERTERS]: [
        {
          ref: 'CUSTOMASSERTER',
          src: {
            assertConvoStep: ({ botMsg, args }) => {
              assert.lengthOf(args, 2)
              assert.equal(args[0], 'question1')
              assert.equal(args[1], 'question2')
            }
          }
        }
      ]
    }
    const driver = new BotDriver(myCaps)
    const compiler = driver.BuildCompiler()
    const container = await driver.Build()

    compiler.ReadScript(path.resolve(__dirname, 'convos'), 'applyscriptingmemorytoasserterargs.convo.txt')
    assert.equal(compiler.convos.length, 1)

    const transcript = await compiler.convos[0].Run(container)
    assert.isObject(transcript.scriptingMemory)
  })
})

describe('convo.scriptingMemory.api', function () {
  describe('convo.scriptingMemory.api.fill', function () {
    beforeEach(async function () {
      this.containerStub = {
        caps: {
          [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
          [Capabilities.SCRIPTING_NORMALIZE_TEXT]: true
        }
      }
      this.containerStubMatchingModeWord = {
        caps: {
          [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
          [Capabilities.SCRIPTING_NORMALIZE_TEXT]: true,
          [Capabilities.SCRIPTING_MEMORY_MATCHING_MODE]: 'word'
        }
      }
      this.containerStubMatchingModeJoker = {
        caps: {
          [Capabilities.SCRIPTING_ENABLE_MEMORY]: true,
          [Capabilities.SCRIPTING_NORMALIZE_TEXT]: true,
          [Capabilities.SCRIPTING_MEMORY_MATCHING_MODE]: 'joker'
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
      assert.equal(scriptingMemory.$num, '1')
    })
    it('should not fill scripting memory from invalid text', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'test sentence', 'test sentence $num', this.convo.scriptingEvents)
      assert.isUndefined(scriptingMemory.$num)
    })
    it('should fill scripting memory from one utterance', async function () {
      this.scriptingProvider.AddUtterances({
        name: 'utt1',
        utterances: ['test sentence $num']
      })

      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'test sentence 1', 'utt1', this.convo.scriptingEvents)
      assert.equal(scriptingMemory.$num, '1')
    })
    it('should fill multiple scripting memory from one utterance', async function () {
      this.scriptingProvider.AddUtterances({
        name: 'utt1',
        utterances: ['test sentence $num1 $num2']
      })

      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'test sentence 1 2', 'utt1', this.convo.scriptingEvents)
      assert.equal(scriptingMemory.$num1, '1')
      assert.equal(scriptingMemory.$num2, '2')
    })
    it('should fill scripting memory from two different utterances', async function () {
      this.scriptingProvider.AddUtterances({
        name: 'utt1',
        utterances: ['i am $months months old', 'i am $years years old']
      })

      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'i am 2 months old', 'utt1', this.convo.scriptingEvents)
      assert.equal(scriptingMemory.$months, '2')
      assert.isUndefined(scriptingMemory.$years)
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
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'test sentence 1 end', '.* sentence $num', this.convo.scriptingEvents)
      assert.equal(scriptingMemory.$num, '1')
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
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'test sentence 1 end', 'utt1', this.convo.scriptingEvents)
      assert.equal(scriptingMemory.$num, '1')
      const tomatch = this.convo._resolveUtterancesToMatch(this.containerStub, scriptingMemory, 'utt1')
      assert.isArray(tomatch)
      assert.equal(tomatch[0], '.* sentence 1')
    })
    it('should accept special regexp characters in utterance when filling scripting memory', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, '*test sentence 1*', '*test sentence $num*', this.convo.scriptingEvents)
      assert.equal(scriptingMemory.$num, '1')

      const scriptingMemory1 = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory1, 'Hier sind deine Erinnerungen: Notiz: 104 | This is a test reminder', 'Hier sind deine Erinnerungen: Notiz: $id | This is a test reminder', this.convo.scriptingEvents)
      assert.equal(scriptingMemory1.$id, '104')
    })
    it('should accept special regexp characters in utterances when filling scripting memory', async function () {
      this.scriptingProvider.AddUtterances({
        name: 'utt1',
        utterances: ['[\'I am $months months old.\']', '[\'I am $years years old.\']']
      })
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, '[\'I am 2 years old.\']', 'utt1', this.convo.scriptingEvents)
      assert.equal(scriptingMemory.$years, '2')
    })
    it('should accept newline characters in utterances when filling scripting memory', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'test sentence header\n\ntest sentence 1', 'test sentence header\n\ntest sentence $num', this.convo.scriptingEvents)
      assert.equal(scriptingMemory.$num, '1')
    })
    it('should accept variable name case sensitive', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'test sentence 1', 'test sentence $Num', this.convo.scriptingEvents)
      assert.equal(scriptingMemory.$num, undefined)
      assert.equal(scriptingMemory.$Num, '1')
    })
    it('should accept variable name as postfix', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'test sentence a1', 'test sentence a$Num', this.convo.scriptingEvents)
      assert.equal(scriptingMemory.$num, undefined)
      assert.equal(scriptingMemory.$Num, '1')
    })
    it('should not change scripting memory functions', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'test sentence a1', 'test sentence a$now', this.convo.scriptingEvents)
      assert.notEqual(scriptingMemory.$now, '1')
    })
    it('should match normalized response', async function () {
      let result = "<speak>Kentucky is the 15th state, admitted to the Union in 1792. The capital of Kentucky is Frankfort, and the abbreviation for Kentucky is <break strength='strong'/><say-as interpret-as='spell-out'>KY</say-as>. I've added Kentucky to your Alexa app. Which other state or capital would you like to know about?</speak>"
      const expected = "$state is the 15th state, admitted to the Union in 1792. The capital of Kentucky is Frankfort, and the abbreviation for Kentucky is KY. I've added Kentucky to your Alexa app. Which other state or capital would you like to know about?"

      result = normalizeText(result, true)

      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, result, expected, this.convo.scriptingEvents)
      assert.equal(scriptingMemory.$state, 'Kentucky')
    })
    it('should match not-whitespace (SCRIPTING_MEMORY_MATCHING_MODE == non_whitespace, default)', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'date: 28.01.2019', 'date: $somedate', this.convo.scriptingEvents)
      assert.equal(scriptingMemory.$somedate, '28.01.2019')
    })
    it('should match not-whitespace (SCRIPTING_MEMORY_MATCHING_MODE == word)', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStubMatchingModeWord, scriptingMemory, 'my name is joe.', 'my name is $name', this.convo.scriptingEvents)
      assert.equal(scriptingMemory.$name, 'joe')
    })
    it('should match multi lines (SCRIPTING_MEMORY_MATCHING_MODE == joker)', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStubMatchingModeJoker, scriptingMemory, 'test sentence \nline1\r\nline2', 'test sentence $lines', this.convo.scriptingEvents)
      assert.equal(scriptingMemory.$lines, '\nline1\r\nline2')
    })
    it('should match multi words (SCRIPTING_MEMORY_MATCHING_MODE == joker)', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStubMatchingModeJoker, scriptingMemory, 'test sentence match1 match2', 'test sentence $words', this.convo.scriptingEvents)
      assert.equal(scriptingMemory.$words, 'match1 match2')
    })
    // this is not an expectation, nothing depends on this behaviour
    it('should match $', async function () {
      const scriptingMemory = {}
      ScriptingMemory.fill(this.containerStub, scriptingMemory, 'text: textwith$', 'text: $sometext', this.convo.scriptingEvents)
      assert.equal(scriptingMemory.$sometext, 'textwith$')
    })
  })

  describe('convo.scriptingMemory.api.apply', function () {
    it('should apply on exact match', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { $num: 1 },
        'test sentence $num'
      )
      assert.equal(result, 'test sentence 1')
    })

    it('should apply on prefix match', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { $num: 1 },
        'test sentence $numPc'
      )
      assert.equal(result, 'test sentence 1Pc')
    })

    it('should apply on postfix match', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { $num: 1 },
        'test sentence Number$num'
      )
      assert.equal(result, 'test sentence Number1')
    })

    it('should apply on middle match', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { $num: 1 },
        'test sentence Number$numPc'
      )
      assert.equal(result, 'test sentence Number1Pc')
    })

    it('should not apply if name is wrong', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { $um: 1 },
        'test sentence $num'
      )
      assert.equal(result, 'test sentence $num')
    })

    it('should not be confused on overlapping names 1', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { $num: '1', $number: '2' },
        'test sentence $num $number'
      )
      assert.equal(result, 'test sentence 1 2')
    })

    it('should not be confused on overlapping names 2', async function () {
      const result = ScriptingMemory.apply(
        { caps: { [Capabilities.SCRIPTING_ENABLE_MEMORY]: true } },
        { $number: '2', $num: '1' },
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
      const asserter = {
        name: 'DUMMY',
        args: [
          'dbUrl',
          '$count',
          'INSERT INTO dummy(name, birthday) VALUES (\'Max Mustermann\', 1991-03-26);'
        ]
      }
      const scriptingMemory = {
        $count: '5'
      }
      assert.equal(ScriptingMemory.applyToArgs(asserter.args, scriptingMemory, CAPS_BASE)[1], 5)
    })
    it('typo of reference', async function () {
      const asserter = {
        name: 'DUMMY',
        args: [
          'dbUrl',
          '$ount',
          'INSERT INTO dummy(name, birthday) VALUES (\'Max Mustermann\', 1991-03-26);'
        ]
      }
      const scriptingMemory = {
        $count: '5'
      }
      assert.notEqual(ScriptingMemory.applyToArgs(asserter.args, scriptingMemory, CAPS_BASE)[1], 5)
    })
    it('as postfix', async function () {
      const asserter = {
        name: 'DUMMY',
        args: [
          'dbUrl',
          'prefix$count',
          'INSERT INTO dummy(name, birthday) VALUES (\'Max Mustermann\', 1991-03-26);'
        ]
      }
      const scriptingMemory = {
        $count: '5'
      }
      assert.equal(ScriptingMemory.applyToArgs(asserter.args, scriptingMemory, CAPS_BASE)[1], 'prefix5')
    })
    it('as prefix', async function () {
      const asserter = {
        name: 'DUMMY',
        args: [
          'dbUrl',
          '$counter',
          'INSERT INTO dummy(name, birthday) VALUES (\'Max Mustermann\', 1991-03-26);'
        ]
      }
      const scriptingMemory = {
        $count: '5'
      }
      assert.equal(ScriptingMemory.applyToArgs(asserter.args, scriptingMemory, CAPS_BASE)[1], '5er')
    })
    it('different value', async function () {
      const asserter = {
        name: 'DUMMY',
        args: [
          'dbUrl',
          '$count',
          'INSERT INTO dummy(name, birthday) VALUES (\'Max Mustermann\', 1991-03-26);'
        ]
      }
      const scriptingMemory = {
        $count: '4'
      }
      assert.notEqual(ScriptingMemory.applyToArgs(asserter.args, scriptingMemory, CAPS_BASE)[1], 5)
    })

    it('different value', async function () {
      const asserter = {
        name: 'DUMMY',
        args: [
          'dbUrl',
          '$count',
          'INSERT INTO dummy(name, birthday) VALUES (\'Max Mustermann\', 1991-03-26);'
        ]
      }
      const scriptingMemory = {
        $count: '4'
      }
      assert.notEqual(ScriptingMemory.applyToArgs(asserter.args, scriptingMemory, CAPS_BASE)[1], 5)
    })

    it('scripting memory functions', async function () {
      const asserter = {
        name: 'DUMMY',
        args: [
          'dbUrl',
          '$year',
          'INSERT INTO dummy(name, birthday) VALUES (\'Max Mustermann\', 1991-03-26);'
        ]
      }
      const scriptingMemory = {}

      const year = ScriptingMemory.applyToArgs(asserter.args, scriptingMemory, CAPS_BASE)[1]
      assert(year >= 2019 && year <= 2219, '$year invalid')
    })
  })

  // if a function is working with apply, then it has to work with applyToArgs too
  describe('convo.scriptingMemory.api.functions', function () {
    it('remove parameters even if the function does not need them', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$now(asd)'
      )
      assert.equal(result.indexOf('asd'), -1)
    })

    it('now', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$now'
      )
      assert.equal(result, new Date().toLocaleString())
    })
    it('now_EN', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$now_EN'
      )
      assert(result.indexOf('/') < 3, 'wrong format')
      assert(result.lastIndexOf(':') > 10, 'wrong format')
      assert(result.lastIndexOf(':') > 10, 'wrong format')
    })
    it('now_DE', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$now_DE'
      )
      assert(result.indexOf('.') === 2)
      assert(result.lastIndexOf(':') > 10)
    })
    it('now_ISO', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$now_ISO'
      )
      assert(result.length === 24)
      assert.equal(result.indexOf('-'), 4)
      assert.equal(result.lastIndexOf('.'), 19)
    })

    it('date', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$date'
      )
      assert.equal(result, new Date().toLocaleDateString())
    })
    it('date with param', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$date(YYYY)'
      )
      assert.equal(result.length, 4)
    })
    it('date_EN', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$date_EN'
      )
      assert(result.length <= 10, 'wrong format')
      assert(result.indexOf('/') <= 2, 'wrong format')
      assert(result.lastIndexOf('/') <= 5, 'wrong format')
    })
    it('date_DE', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$date_DE'
      )
      assert(result.length <= 10, 'wrong format')
      assert(result.indexOf('.') === 4, 'wrong format')
      assert(result.lastIndexOf('.') === 7, 'wrong format')
    })
    it('date_ISO', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$date_ISO'
      )
      assert.equal(result.length, 10)
      assert.equal(result.indexOf('-'), 4)
      assert.equal(result.lastIndexOf('-'), 7)
    })

    it('time', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$time'
      )
      assert(result.indexOf(':') < 3)
    })
    it('time_EN', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$time_EN'
      )
      assert(result.indexOf(':') < 3)
      assert(result.lastIndexOf(' ') < 9)
    })
    it('time_DE', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$time_DE'
      )
      assert(result.indexOf(':') !== result.lastIndexOf(':'))
    })
    it('time_ISO', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$time_ISO'
      )
      assert(result.indexOf(':') !== result.lastIndexOf(':'))
    })
    it('time_HH_MM', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$time_HH_MM'
      )
      assert(result.indexOf(':') === 2)
    })
    it('time_H_A', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$time_H_A'
      )
      assert(result.indexOf(' ') > 0)
    })

    it('timestamp', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$timestamp'
      )
      assert(result.length === 13, '$timestap is invalid')
    })

    it('year', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$year'
      )

      const year = parseInt(result)
      assert(year >= 2019 && year <= 2219, '$year invalid')
    })

    it('month', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$month'
      )

      assert(result.length >= 2 && result.length <= 10, '$month invalid')
    })
    it('month_MM', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$month_MM'
      )

      assert(result.length > 0 && result.length < 3, '$month invalid')
    })

    it('day_of_month', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$day_of_month'
      )

      const dayOfMonth = parseInt(result)
      assert(dayOfMonth >= 1 && dayOfMonth <= 35, 'day_of_month invalid')
    })

    it('day_of_week', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$day_of_week'
      )

      assert(result.length >= 2 && result.length <= 20, '$day_of_week invalid')
    })

    it('random', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$random(19)'
      )

      assert(result.length === 19, '$random invalid')
    })
    it('random10', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$random10'
      )

      assert(result.length === 10, '$random10 invalid')
    })

    it('uniqid', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$uniqid'
      )

      assert(result.length === 36, '$uniqid invalid')
    })

    it('func', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$func(3*5)'
      )

      assert(result === '15', 'func invalid')
    })
    it('func with caps', async function () {
      const result = ScriptingMemory.apply(
        { caps: Object.assign({}, CAPS_ENABLE_SCRIPTING_MEMORY, { mycap: 'botium' }) },
        { },
        '$func(caps.mycap)'
      )
      assert.equal(result, 'botium')
    })
    it('func invalid code', async function () {
      try {
        ScriptingMemory.apply(
          { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
          { },
          '$func(hugo123)'
        )
        assert.fail('should have failed')
      } catch (err) {
        assert.isTrue(err.message.indexOf('func function execution failed') >= 0)
      }
    })
    it('func environment variable', async function () {
      process.env.MY_VAR_VALUE = 'botium'
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$func(process.env.MY_VAR_VALUE)'
      )
      assert.equal(result, 'botium')
    })
    it('environment variable', async function () {
      process.env.MY_VAR_VALUE = 'botium'
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$env(MY_VAR_VALUE)'
      )
      assert.equal(result, 'botium')
    })
    it('environment variable reject', async function () {
      process.env.MY_VAR_VALUE = 'botium'
      try {
        ScriptingMemory.apply(
          { caps: Object.assign({}, CAPS_ENABLE_SCRIPTING_MEMORY, { SECURITY_ALLOW_UNSAFE: false }) },
          { },
          '$env(MY_VAR_VALUE)'
        )
        assert.fail('should have failed')
      } catch (err) {
        assert.isTrue(err.message.indexOf('Using unsafe scripting memory function $env is not allowed') >= 0)
      }
    })
    it('cap', async function () {
      const result = ScriptingMemory.apply(
        { caps: Object.assign({}, CAPS_ENABLE_SCRIPTING_MEMORY, { mycap: 'botium' }) },
        { },
        '$cap(mycap)'
      )
      assert.equal(result, 'botium')
    })
    it('msg with messageText', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$msg($.messageText)',
        { messageText: 'botium' }
      )
      assert.equal(result, 'botium')
    })
    it('msg with messageText twice', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$msg($.messageText) $msg($.messageText)',
        { messageText: 'botium' }
      )
      assert.equal(result, 'botium botium')
    })
    it('msg with sourceData', async function () {
      const result = ScriptingMemory.apply(
        { caps: CAPS_ENABLE_SCRIPTING_MEMORY },
        { },
        '$msg($.sourceData.opt1)',
        { messageText: 'botium', sourceData: { opt1: 'botium' } }
      )
      assert.equal(result, 'botium')
    })
    it('projectname', async function () {
      const result = ScriptingMemory.apply(
        { caps: Object.assign({}, CAPS_ENABLE_SCRIPTING_MEMORY, { PROJECTNAME: 'botium' }) },
        { },
        '$projectname'
      )
      assert.equal(result, 'botium')
    })
    it('testsessionname', async function () {
      const result = ScriptingMemory.apply(
        { caps: Object.assign({}, CAPS_ENABLE_SCRIPTING_MEMORY, { TESTSESSIONNAME: 'botium' }) },
        { },
        '$testsessionname'
      )
      assert.equal(result, 'botium')
    })
    it('testcasename', async function () {
      const result = ScriptingMemory.apply(
        { caps: Object.assign({}, CAPS_ENABLE_SCRIPTING_MEMORY, { TESTCASENAME: 'botium' }) },
        { },
        '$testcasename'
      )
      assert.equal(result, 'botium')
    })
  })
})
