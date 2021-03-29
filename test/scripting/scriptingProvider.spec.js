const path = require('path')
const assert = require('chai').assert
const expect = require('chai').expect
const { Convo } = require('../../src/scripting/Convo')
const ScriptingProvider = require('../../src/scripting/ScriptingProvider')
const DefaultCapabilities = require('../../src/Defaults').Capabilities
const Capabilities = require('../../src/Capabilities')

describe('scriptingProvider.ReadScriptsFromDirectory', function () {
  it('should read multiple files from dir', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const { convos } = await scriptingProvider.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos'))

    assert.isArray(convos)
    assert.equal(convos.length, 2)
  })
  it('should read multiple files from dir with globFilter', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const { convos } = await scriptingProvider.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos'), '**/*.convo.txt')

    assert.isArray(convos)
    assert.equal(convos.length, 2)
  })
  it('should ignore files from dir with globFilter', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const { convos } = await scriptingProvider.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos'), 'sepp.txt')

    assert.isArray(convos)
    assert.equal(convos.length, 0)
  })
  it('should read single file from file path', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const { convos } = await scriptingProvider.ReadScriptsFromDirectory(path.resolve(__dirname, 'convos', 'convo1.convo.txt'))

    assert.isArray(convos)
    assert.equal(convos.length, 1)
  })
  it('should skip convos', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const { convos } = await scriptingProvider.ReadScriptsFromDirectory(path.resolve(__dirname, 'skipconvos'))

    assert.isArray(convos)
    assert.equal(convos.length, 1)
  })
})

describe('scriptingProvider._resolveUtterances', function () {
  it('should resolve utterance', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })

    const tomatch = scriptingContext.scriptingEvents.resolveUtterance({ utterance: 'utt1' })
    assert.isArray(tomatch)
    assert.equal(tomatch.length, 2)
    assert.equal(tomatch[0], 'TEXT1')
    assert.equal(tomatch[1], 'TEXT2')
    scriptingContext.scriptingEvents.assertBotResponse('TEXT1', tomatch, 'test1')
  })
  it('should resolve null on invalid utterance', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })

    const tomatch = scriptingContext.scriptingEvents.resolveUtterance({ utterance: 'utt2', resolveEmptyIfUnknown: true })
    assert.isNull(tomatch)
  })
  it('should fail on invalid utterance', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })

    const tomatch = scriptingContext.scriptingEvents.resolveUtterance({ utterance: 'utt2' })
    assert.isArray(tomatch)
    assert.equal(tomatch.length, 1)
    assert.equal(tomatch[0], 'utt2')
    try {
      scriptingContext.scriptingEvents.assertBotResponse('TEXT1', tomatch, 'test1')
      assert.fail('expected error')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Bot response') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.deepEqual(err.context.cause.expected, tomatch)
      assert.equal(err.context.cause.actual, 'TEXT1')
    }
  })
  it('should fail on unresolved utterance', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })
    try {
      scriptingContext.scriptingEvents.assertBotResponse('TEXT1', 'utt1', 'test1')
      assert.fail('expected error')
    } catch (err) {
      assert.isTrue(err.message.indexOf('Bot response') > 0)
      assert.isNotNull(err.context)
      assert.isNotNull(err.context.cause)
      assert.isArray(err.context.cause.expected)
      assert.deepEqual(err.context.cause.expected, ['utt1'])
      assert.equal(err.context.cause.actual, 'TEXT1')
    }
  })
  it('should resolve and format utterance args', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1 %s', 'TEXT2 %s']
    })

    const tomatch = scriptingContext.scriptingEvents.resolveUtterance({ utterance: 'utt1 hello' })
    assert.isArray(tomatch)
    assert.equal(tomatch.length, 2)
    assert.equal(tomatch[0], 'TEXT1 hello')
    assert.equal(tomatch[1], 'TEXT2 hello')
    scriptingContext.scriptingEvents.assertBotResponse('TEXT1 hello', tomatch, 'test1')
  })
  it('should resolve and append utterance args', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })

    const tomatch = scriptingContext.scriptingEvents.resolveUtterance({ utterance: 'utt1 hello' })
    assert.isArray(tomatch)
    assert.equal(tomatch.length, 2)
    assert.equal(tomatch[0], 'TEXT1 hello')
    assert.equal(tomatch[1], 'TEXT2 hello')
    scriptingContext.scriptingEvents.assertBotResponse('TEXT1 hello', tomatch, 'test1')
  })

  describe('should resolve utterance with ambiguous scripting memory variable (with a debug message)', function () {
    it('expected none, found $name', async function () {
      const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
      await scriptingProvider.Build()
      const scriptingContext = scriptingProvider._buildScriptContext()
      scriptingProvider.AddUtterances({
        name: 'utt1',
        utterances: ['Hi!', 'Hi $name']
      })

      const tomatch = scriptingContext.scriptingEvents.resolveUtterance({ utterance: 'utt1' })
      assert.isArray(tomatch)
      assert.equal(tomatch.length, 2)
      assert.equal(tomatch[0], 'Hi!')
      assert.equal(tomatch[1], 'Hi $name')
    })

    it('expected none, found $name in different Utterance', async function () {
      const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
      await scriptingProvider.Build()
      const scriptingContext = scriptingProvider._buildScriptContext()
      scriptingProvider.AddUtterances({
        name: 'utt1',
        utterances: ['Hi!']
      })
      scriptingProvider.AddUtterances({
        name: 'utt1',
        utterances: ['Hi $name']
      })

      const tomatch = scriptingContext.scriptingEvents.resolveUtterance({ utterance: 'utt1' })
      assert.isArray(tomatch)
      assert.equal(tomatch.length, 2)
      assert.equal(tomatch[0], 'Hi!')
      assert.equal(tomatch[1], 'Hi $name')
    })

    it('expected $name, found none', async function () {
      const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
      await scriptingProvider.Build()
      const scriptingContext = scriptingProvider._buildScriptContext()
      scriptingProvider.AddUtterances({
        name: 'utt1',
        utterances: ['Hi $name', 'Hi!']
      })

      const tomatch = scriptingContext.scriptingEvents.resolveUtterance({ utterance: 'utt1' })
      assert.isArray(tomatch)
      assert.equal(tomatch.length, 2)
      assert.equal(tomatch[0], 'Hi $name')
      assert.equal(tomatch[1], 'Hi!')
    })
  })
})

describe('scriptingProvider._isValidAsserterType', function () {
  it('valid asserterType', async function () {
    const scriptingProvider = new ScriptingProvider()
    assert.equal(scriptingProvider._isValidAsserterType('assertConvoStep'), true)
  })
  it('invalid asserterType', async function () {
    const scriptingProvider = new ScriptingProvider()
    assert.equal(scriptingProvider._isValidAsserterType('assertStep'), false)
  })
})

describe('scriptingProvider._tagAndCleanupUtterances', function () {
  it('positive case remove empty String from utterances', async function () {
    const scriptingProvider = new ScriptingProvider()
    const utterances = ['don\'t understand', 'sorry', '']
    const fileUtterances = [{ name: 'INCOMPREHENSION', utterances: utterances }]
    const actualResult = scriptingProvider._tagAndCleanupUtterances(fileUtterances, 'mydir', 'incomprehension.utterances.txt')
    expect(actualResult[0].utterances).to.eql(utterances.slice(0, 2))
  })
})

describe('scriptingProvider.ExpandConvos', function () {
  it('should build convos for utterance', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })
    scriptingProvider.AddConvos(new Convo(scriptingProvider._buildScriptContext(), {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'me',
          messageText: 'utt1'
        }
      ]
    }))

    scriptingProvider.ExpandConvos()
    assert.equal(scriptingProvider.convos.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation.length, 1)
    assert.equal(scriptingProvider.convos[0].header.name, 'test convo/utt1-L1')
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'TEXT1')
    assert.equal(scriptingProvider.convos[1].conversation.length, 1)
    assert.equal(scriptingProvider.convos[1].header.name, 'test convo/utt1-L2')
    assert.equal(scriptingProvider.convos[1].conversation[0].messageText, 'TEXT2')
  })
  it('should build convos for utterance with parameters', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1 %s-%d', 'TEXT2']
    })
    scriptingProvider.AddConvos(new Convo(scriptingProvider._buildScriptContext(), {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'me',
          messageText: 'utt1 arg0 1'
        }
      ]
    }))

    scriptingProvider.ExpandConvos()
    assert.equal(scriptingProvider.convos.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation.length, 1)
    assert.equal(scriptingProvider.convos[0].header.name, 'test convo/utt1-L1')
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'TEXT1 arg0-1')
    assert.equal(scriptingProvider.convos[1].conversation.length, 1)
    assert.equal(scriptingProvider.convos[1].header.name, 'test convo/utt1-L2')
    assert.equal(scriptingProvider.convos[1].conversation[0].messageText, 'TEXT2 arg0 1')
  })
  it('should build convos for utterance with whitespace', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    scriptingProvider.AddUtterances({
      name: 'utt with some whitespace',
      utterances: ['TEXT1', 'TEXT2']
    })
    scriptingProvider.AddConvos(new Convo(scriptingProvider._buildScriptContext(), {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'me',
          messageText: 'utt with some whitespace'
        }
      ]
    }))

    scriptingProvider.ExpandConvos()
    assert.equal(scriptingProvider.convos.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation.length, 1)
    assert.equal(scriptingProvider.convos[0].header.name, 'test convo/utt with some whitespace-L1')
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'TEXT1')
    assert.equal(scriptingProvider.convos[1].conversation.length, 1)
    assert.equal(scriptingProvider.convos[1].header.name, 'test convo/utt with some whitespace-L2')
    assert.equal(scriptingProvider.convos[1].conversation[0].messageText, 'TEXT2')
  })
  describe('should build convos for SCRIPTING_UTTEXPANSION_NAMING_MODE', function () {
    const utterances = {
      name: 'uttText',
      utterances: ['TEXT1 01234567890123456789', 'TEXT2 01234567890123456789']
    }
    const convoUtterances = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'me',
          messageText: 'uttText'
        }
      ]
    }

    it('SCRIPTING_UTTEXPANSION_NAMING_MODE=justLineNumber', async function () {
      const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
      await scriptingProvider.Build()
      scriptingProvider.AddUtterances(utterances)
      scriptingProvider.AddConvos(new Convo(scriptingProvider._buildScriptContext(), convoUtterances))

      scriptingProvider.ExpandConvos()
      assert.equal(scriptingProvider.convos.length, 2)
      assert.equal(scriptingProvider.convos[0].conversation.length, 1)
      assert.equal(scriptingProvider.convos[0].header.name, 'test convo/uttText-L1')
      assert.equal(scriptingProvider.convos[1].header.name, 'test convo/uttText-L2')
    })

    it('SCRIPTING_UTTEXPANSION_NAMING_MODE=utterance', async function () {
      const scriptingProvider = new ScriptingProvider(Object.assign(
        {},
        DefaultCapabilities,
        {
          [Capabilities.SCRIPTING_UTTEXPANSION_NAMING_MODE]: 'utterance'
        }
      ))
      await scriptingProvider.Build()
      scriptingProvider.AddUtterances(utterances)
      scriptingProvider.AddConvos(new Convo(scriptingProvider._buildScriptContext(), convoUtterances))

      scriptingProvider.ExpandConvos()
      assert.equal(scriptingProvider.convos.length, 2)
      assert.equal(scriptingProvider.convos[0].conversation.length, 1)
      assert.equal(scriptingProvider.convos[0].header.name, 'test convo/uttText-L1-TEXT1 0123456...')
      assert.equal(scriptingProvider.convos[1].header.name, 'test convo/uttText-L2-TEXT2 0123456...')
    })

    it('SCRIPTING_UTTEXPANSION_NAMING_MODE=utterance, turn length off', async function () {
      const scriptingProvider = new ScriptingProvider(Object.assign(
        {},
        DefaultCapabilities,
        {
          [Capabilities.SCRIPTING_UTTEXPANSION_NAMING_MODE]: 'utterance',
          [Capabilities.SCRIPTING_UTTEXPANSION_NAMING_UTTERANCE_MAX]: null
        }
      ))
      await scriptingProvider.Build()
      scriptingProvider.AddUtterances(utterances)
      scriptingProvider.AddConvos(new Convo(scriptingProvider._buildScriptContext(), convoUtterances))

      scriptingProvider.ExpandConvos()
      assert.equal(scriptingProvider.convos.length, 2)
      assert.equal(scriptingProvider.convos[0].conversation.length, 1)
      assert.equal(scriptingProvider.convos[0].header.name, 'test convo/uttText-L1-TEXT1 01234567890123456789')
      assert.equal(scriptingProvider.convos[1].header.name, 'test convo/uttText-L2-TEXT2 01234567890123456789')
    })

    it('SCRIPTING_UTTEXPANSION_NAMING_MODE=utterance len=10', async function () {
      const scriptingProvider = new ScriptingProvider(Object.assign(
        {},
        DefaultCapabilities,
        {
          [Capabilities.SCRIPTING_UTTEXPANSION_NAMING_MODE]: 'utterance',
          [Capabilities.SCRIPTING_UTTEXPANSION_NAMING_UTTERANCE_MAX]: 10
        }
      ))
      await scriptingProvider.Build()
      scriptingProvider.AddUtterances(utterances)
      scriptingProvider.AddConvos(new Convo(scriptingProvider._buildScriptContext(), convoUtterances))

      scriptingProvider.ExpandConvos()
      assert.equal(scriptingProvider.convos.length, 2)
      assert.equal(scriptingProvider.convos[0].conversation.length, 1)
      assert.equal(scriptingProvider.convos[0].header.name, 'test convo/uttText-L1-TEXT1 0...')
      assert.equal(scriptingProvider.convos[1].header.name, 'test convo/uttText-L2-TEXT2 0...')
    })
    it('SCRIPTING_UTTEXPANSION_NAMING_MODE=utterance userinputs', async function () {
      const scriptingProvider = new ScriptingProvider(Object.assign(
        {},
        DefaultCapabilities,
        {
          [Capabilities.SCRIPTING_UTTEXPANSION_NAMING_MODE]: 'utterance'
        }
      ))
      await scriptingProvider.Build()
      scriptingProvider.AddConvos(new Convo(scriptingProvider._buildScriptContext(), {
        header: {
          name: 'test convo'
        },
        sourceTag: {},
        conversation: [
          {
            sender: 'me',
            userInputs: [
              {
                name: 'BUTTON',
                args: ['button1']
              },
              {
                name: 'MEDIA',
                args: ['test1.jpg', 'test2 01234567890123456789.jpg', 'test3.jpg']
              }
            ]
          }
        ]
      }))

      scriptingProvider.ExpandConvos()
      assert.equal(scriptingProvider.convos.length, 3)
      assert.equal(scriptingProvider.convos[0].conversation.length, 1)
      assert.equal(scriptingProvider.convos[0].header.name, 'test convo/MEDIA-L1-test1.jpg')
      assert.equal(scriptingProvider.convos[1].header.name, 'test convo/MEDIA-L2-test2 0123456...')
      assert.equal(scriptingProvider.convos[2].header.name, 'test convo/MEDIA-L3-test3.jpg')
    })
    it('SCRIPTING_UTTEXPANSION_NAMING_MODE=utterance userinputs and utterances', async function () {
      const scriptingProvider = new ScriptingProvider(Object.assign(
        {},
        DefaultCapabilities,
        {
          [Capabilities.SCRIPTING_UTTEXPANSION_NAMING_MODE]: 'utterance'
        }
      ))
      await scriptingProvider.Build()
      scriptingProvider.AddUtterances(utterances)
      scriptingProvider.AddConvos(new Convo(scriptingProvider._buildScriptContext(), {
        header: {
          name: 'test convo'
        },
        sourceTag: {},
        conversation: [
          {
            sender: 'me',
            messageText: 'uttText',
            userInputs: [
              {
                name: 'BUTTON',
                args: ['button1']
              },
              {
                name: 'MEDIA',
                args: ['test1.jpg', 'test2 01234567890123456789.jpg', 'test3.jpg']
              }
            ]
          }
        ]
      }))

      scriptingProvider.ExpandConvos()
      assert.equal(scriptingProvider.convos.length, 5)
      assert.equal(scriptingProvider.convos[0].conversation.length, 1)
      assert.equal(scriptingProvider.convos[0].header.name, 'test convo/MEDIA-L1-test1.jpg')
      assert.equal(scriptingProvider.convos[1].header.name, 'test convo/MEDIA-L2-test2 0123456...')
      assert.equal(scriptingProvider.convos[2].header.name, 'test convo/MEDIA-L3-test3.jpg')
      assert.equal(scriptingProvider.convos[3].header.name, 'test convo/uttText-L1-TEXT1 0123456...')
      assert.equal(scriptingProvider.convos[4].header.name, 'test convo/uttText-L2-TEXT2 0123456...')
    })
  })
})

describe('scriptingProvider.ExpandUtterancesToConvos', function () {
  it('should build plain convos for utterance', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })

    scriptingProvider.ExpandUtterancesToConvos()
    assert.equal(scriptingProvider.convos.length, 1)
    assert.equal(scriptingProvider.convos[0].conversation.length, 2)
    assert.equal(scriptingProvider.convos[0].header.name, 'utt1')
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'utt1')

    scriptingProvider.ExpandConvos()
    assert.equal(scriptingProvider.convos.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation.length, 2)
    assert.equal(scriptingProvider.convos[0].header.name, 'utt1/utt1-L1')
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'TEXT1')
    assert.equal(scriptingProvider.convos[0].toString(), '1 utt1/utt1-L1 (Expanded Utterances - utt1) ({ origUttName: \'utt1\', origConvoName: \'utt1\' }): Step 1 - tell utterance: #me - TEXT1 | Step 2 - check bot response: #bot - ')
    assert.equal(scriptingProvider.convos[1].conversation.length, 2)
    assert.equal(scriptingProvider.convos[1].header.name, 'utt1/utt1-L2')
    assert.equal(scriptingProvider.convos[1].conversation[0].messageText, 'TEXT2')
    assert.equal(scriptingProvider.convos[1].toString(), '2 utt1/utt1-L2 (Expanded Utterances - utt1) ({ origUttName: \'utt1\', origConvoName: \'utt1\' }): Step 1 - tell utterance: #me - TEXT2 | Step 2 - check bot response: #bot - ')
  })
  it('should add leading zeros for utterance tags', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: Array.from(Array(10000).keys()).map(i => `TEXT${i + 1}`)
    })

    scriptingProvider.ExpandUtterancesToConvos()
    scriptingProvider.ExpandConvos()

    assert.equal(scriptingProvider.convos.length, 10000)
    assert.equal(scriptingProvider.convos[0].conversation.length, 2)
    assert.equal(scriptingProvider.convos[0].header.name, 'utt1/utt1-L00001')
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'TEXT1')
    assert.equal(scriptingProvider.convos[0].toString(), '1 utt1/utt1-L00001 (Expanded Utterances - utt1) ({ origUttName: \'utt1\', origConvoName: \'utt1\' }): Step 1 - tell utterance: #me - TEXT1 | Step 2 - check bot response: #bot - ')
    assert.equal(scriptingProvider.convos[1].conversation.length, 2)
    assert.equal(scriptingProvider.convos[1].header.name, 'utt1/utt1-L00002')
    assert.equal(scriptingProvider.convos[1].conversation[0].messageText, 'TEXT2')
    assert.equal(scriptingProvider.convos[1].toString(), '2 utt1/utt1-L00002 (Expanded Utterances - utt1) ({ origUttName: \'utt1\', origConvoName: \'utt1\' }): Step 1 - tell utterance: #me - TEXT2 | Step 2 - check bot response: #bot - ')
  })
  it('should build incomprehension convos for utterance', async function () {
    const scriptingProvider = new ScriptingProvider(Object.assign({}, DefaultCapabilities, { SCRIPTING_UTTEXPANSION_INCOMPREHENSION: 'INCOMPREHENSION' }))
    await scriptingProvider.Build()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })
    scriptingProvider.AddUtterances({
      name: 'INCOMPREHENSION',
      utterances: ['INCOMPREHENSION1', 'INCOMPREHENSION2']
    })

    scriptingProvider.ExpandUtterancesToConvos()
    assert.equal(scriptingProvider.convos.length, 1)
    assert.equal(scriptingProvider.convos[0].conversation.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'utt1')
    assert.equal(scriptingProvider.convos[0].conversation[1].messageText, 'INCOMPREHENSION')
    assert.equal(scriptingProvider.convos[0].conversation[1].not, true)

    scriptingProvider.ExpandConvos()
    assert.equal(scriptingProvider.convos.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'TEXT1')
    assert.equal(scriptingProvider.convos[0].conversation[1].messageText, 'INCOMPREHENSION')
    assert.equal(scriptingProvider.convos[0].conversation[1].not, true)
    assert.equal(scriptingProvider.convos[1].conversation.length, 2)
    assert.equal(scriptingProvider.convos[1].conversation[0].messageText, 'TEXT2')
    assert.equal(scriptingProvider.convos[1].conversation[1].messageText, 'INCOMPREHENSION')
    assert.equal(scriptingProvider.convos[1].conversation[1].not, true)
  })
  it('should build intent check convos for utterance', async function () {
    const scriptingProvider = new ScriptingProvider(Object.assign({}, DefaultCapabilities, { SCRIPTING_UTTEXPANSION_USENAMEASINTENT: true }))
    await scriptingProvider.Build()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })

    scriptingProvider.ExpandUtterancesToConvos()
    assert.equal(scriptingProvider.convos.length, 1)
    assert.equal(scriptingProvider.convos[0].conversation.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'utt1')
    assert.equal(scriptingProvider.convos[0].conversation[1].asserters.length, 1)
    assert.equal(scriptingProvider.convos[0].conversation[1].asserters[0].name, 'INTENT')
    assert.equal(scriptingProvider.convos[0].conversation[1].asserters[0].args[0], 'utt1')

    scriptingProvider.ExpandConvos()
    assert.equal(scriptingProvider.convos.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'TEXT1')
    assert.equal(scriptingProvider.convos[0].conversation[1].asserters.length, 1)
    assert.equal(scriptingProvider.convos[0].conversation[1].asserters[0].name, 'INTENT')
    assert.equal(scriptingProvider.convos[0].conversation[1].asserters[0].args[0], 'utt1')
    assert.equal(scriptingProvider.convos[1].conversation.length, 2)
    assert.equal(scriptingProvider.convos[1].conversation[0].messageText, 'TEXT2')
    assert.equal(scriptingProvider.convos[1].conversation[1].asserters.length, 1)
    assert.equal(scriptingProvider.convos[1].conversation[1].asserters[0].name, 'INTENT')
    assert.equal(scriptingProvider.convos[1].conversation[1].asserters[0].args[0], 'utt1')
  })
  it('should build intent check convos for utterance (with arg)', async function () {
    const scriptingProvider = new ScriptingProvider(Object.assign({}, DefaultCapabilities))
    await scriptingProvider.Build()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })

    scriptingProvider.ExpandUtterancesToConvos({ useNameAsIntent: true })
    assert.equal(scriptingProvider.convos.length, 1)
    assert.equal(scriptingProvider.convos[0].conversation.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'utt1')
    assert.equal(scriptingProvider.convos[0].conversation[1].asserters.length, 1)
    assert.equal(scriptingProvider.convos[0].conversation[1].asserters[0].name, 'INTENT')
    assert.equal(scriptingProvider.convos[0].conversation[1].asserters[0].args[0], 'utt1')

    scriptingProvider.ExpandConvos()
    assert.equal(scriptingProvider.convos.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation.length, 2)
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'TEXT1')
    assert.equal(scriptingProvider.convos[0].conversation[1].asserters.length, 1)
    assert.equal(scriptingProvider.convos[0].conversation[1].asserters[0].name, 'INTENT')
    assert.equal(scriptingProvider.convos[0].conversation[1].asserters[0].args[0], 'utt1')
    assert.equal(scriptingProvider.convos[1].conversation.length, 2)
    assert.equal(scriptingProvider.convos[1].conversation[0].messageText, 'TEXT2')
    assert.equal(scriptingProvider.convos[1].conversation[1].asserters.length, 1)
    assert.equal(scriptingProvider.convos[1].conversation[1].asserters[0].name, 'INTENT')
    assert.equal(scriptingProvider.convos[1].conversation[1].asserters[0].args[0], 'utt1')
  })
  it('should build check-only convos for utterance', async function () {
    const scriptingProvider = new ScriptingProvider(Object.assign({}, DefaultCapabilities))
    await scriptingProvider.Build()
    scriptingProvider.AddUtterances({
      name: 'utt1',
      utterances: ['TEXT1', 'TEXT2']
    })

    scriptingProvider.ExpandUtterancesToConvos()
    assert.lengthOf(scriptingProvider.convos, 1)
    assert.lengthOf(scriptingProvider.convos[0].conversation, 2)
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'utt1')
    assert.equal(scriptingProvider.convos[0].conversation[1].messageText, '')
    assert.isFalse(scriptingProvider.convos[0].conversation[1].not)

    scriptingProvider.ExpandConvos()
    assert.lengthOf(scriptingProvider.convos, 2)
    assert.lengthOf(scriptingProvider.convos[0].conversation, 2)
    assert.equal(scriptingProvider.convos[0].conversation[0].messageText, 'TEXT1')
    assert.equal(scriptingProvider.convos[0].conversation[1].messageText, '')
    assert.isFalse(scriptingProvider.convos[0].conversation[1].not)
    assert.lengthOf(scriptingProvider.convos[1].conversation, 2)
    assert.equal(scriptingProvider.convos[1].conversation[0].messageText, 'TEXT2')
    assert.equal(scriptingProvider.convos[1].conversation[1].messageText, '')
    assert.isFalse(scriptingProvider.convos[1].conversation[1].not)
  })
  it('should fail incomprehension convos for utterance without incomprehension utt', async function () {
    const scriptingProvider = new ScriptingProvider(Object.assign({}, DefaultCapabilities, { SCRIPTING_UTTEXPANSION_INCOMPREHENSION: 'INCOMPREHENSION' }))
    await scriptingProvider.Build()

    try {
      scriptingProvider.ExpandUtterancesToConvos()
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('incomprehension utterance \'INCOMPREHENSION\' undefined') > 0)
    }
  })
})

describe('scriptingProvider.assertBotResponse', function () {
  it('should fail with correct error message on single tomatch', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    try {
      scriptingContext.scriptingEvents.assertBotResponse('actual', 'expected', 'test1')
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'test1: Bot response "actual" expected to match "expected"')
    }
  })
  it('should fail with correct error message on empty bot message', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    try {
      scriptingContext.scriptingEvents.assertBotResponse(null, 'expected', 'test1')
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'test1: Bot response <no response> expected to match "expected"')
    }
  })
  it('should fail with correct error message on multiple tomatch', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    try {
      scriptingContext.scriptingEvents.assertBotResponse('actual', ['expected1', 'expected2'], 'test1')
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'test1: Bot response "actual" expected to match one of "expected1", "expected2"')
    }
  })
})

describe('scriptingProvider.assertBotNotResponse', function () {
  it('should fail with correct error message on match', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    try {
      scriptingContext.scriptingEvents.assertBotNotResponse('Keine Antwort gefunden!', ['Keine Antwort gefunden'], 'test1')
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'test1: Bot response "Keine Antwort gefunden!" expected NOT to match "Keine Antwort gefunden"')
    }
  })
  it('should fail with correct error message on by empty asserter', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    try {
      scriptingContext.scriptingEvents.assertBotNotResponse('Keine Antwort gefunden!', [''], 'test1')
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'test1: Bot response "Keine Antwort gefunden!" expected NOT to match <any response>')
    }
  })
  it('should fail with correct error message on by empty asserter, and empty bot response', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()
    const scriptingContext = scriptingProvider._buildScriptContext()
    try {
      scriptingContext.scriptingEvents.assertBotNotResponse('', [''], 'test1')
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'test1: Bot response <no response> expected NOT to match <any response>')
    }
  })
})
