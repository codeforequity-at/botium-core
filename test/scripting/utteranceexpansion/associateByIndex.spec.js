const path = require('path')
const assert = require('chai').assert
const { Convo } = require('../../../src/scripting/Convo')
const ScriptingProvider = require('../../../src/scripting/ScriptingProvider')
const DefaultCapabilities = require('../../../src/Defaults').Capabilities
const Capabilities = require('../../../src/Capabilities')

const CAPS = Object.assign({}, DefaultCapabilities, {
  [Capabilities.SCRIPTING_UTTEXPANSION_MODE]: 'index',
  [Capabilities.USER_INPUTS]: [
    {
      ref: 'MEDIA',
      src: 'MediaInput',
      args: {
        downloadMedia: true,
        baseDir: path.join(__dirname, 'files')
      }
    }
  ]
})

describe('scripting.utteranceexpansion.associateByIndex', function () {
  it('should associate utterances by index', async function () {
    const scriptingProvider = new ScriptingProvider(CAPS)
    await scriptingProvider.Build()
    // adding more utterances as batch is not working
    scriptingProvider.AddUtterances({
      name: 'UTT_HELLO',
      utterances: ['UTT_HELLO_SAMPLE_1', 'UTT_HELLO_SAMPLE_2', 'UTT_HELLO_SAMPLE_3']
    })
    scriptingProvider.AddUtterances({
      name: 'UTT_BODY',
      utterances: ['UTT_BODY_SAMPLE_1']
    })
    scriptingProvider.AddUtterances({
      name: 'UTT_GOODBYE',
      utterances: ['UTT_GOODBYE_SAMPLE_1', 'UTT_GOODBYE_SAMPLE_2', 'UTT_GOODBYE_SAMPLE_3', 'UTT_GOODBYE_SAMPLE_4', 'UTT_GOODBYE_SAMPLE_5']
    })
    scriptingProvider.AddConvos(new Convo(scriptingProvider._buildScriptContext(), {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'me',
          messageText: 'UTT_HELLO'
        },
        {
          sender: 'bot',
          messageText: 'hello'
        },
        {
          sender: 'me',
          messageText: 'UTT_BODY'
        },
        {
          sender: 'bot',
          messageText: 'body'
        },
        {
          sender: 'me',
          messageText: 'UTT_GOODBYE'
        },
        {
          sender: 'bot',
          messageText: 'goodbye'
        }
      ]
    }))
    scriptingProvider.ExpandConvos()

    assert.equal(scriptingProvider.convos.length, 5)
    assert.equal(scriptingProvider.convos[0].header.name, 'test convo/UTT_HELLO-L1/UTT_BODY-L1/UTT_GOODBYE-L1')
    assert.deepEqual(scriptingProvider.convos[0].conversation.length, 6)
    assert.equal(scriptingProvider.convos[1].header.name, 'test convo/UTT_HELLO-L2/UTT_BODY-L1/UTT_GOODBYE-L2')
    assert.deepEqual(scriptingProvider.convos[1].conversation.length, 6)
    assert.equal(scriptingProvider.convos[2].header.name, 'test convo/UTT_HELLO-L3/UTT_BODY-L1/UTT_GOODBYE-L3')
    assert.deepEqual(scriptingProvider.convos[2].conversation.length, 6)
    assert.equal(scriptingProvider.convos[3].header.name, 'test convo/UTT_HELLO-L3/UTT_BODY-L1/UTT_GOODBYE-L4')
    assert.deepEqual(scriptingProvider.convos[3].conversation.length, 6)
    assert.equal(scriptingProvider.convos[4].header.name, 'test convo/UTT_HELLO-L3/UTT_BODY-L1/UTT_GOODBYE-L5')
    assert.deepEqual(scriptingProvider.convos[4].conversation.length, 6)
  })
  it('should associate media by index', async function () {
    const scriptingProvider = new ScriptingProvider(CAPS)
    await scriptingProvider.Build()

    scriptingProvider.AddConvos(new Convo(scriptingProvider._buildScriptContext(), {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'me',
          userInputs: [
            {
              name: 'MEDIA',
              args: [
                'step0*.wav'
              ]
            }
          ]
        },
        {
          sender: 'bot',
          messageText: 'hello'
        },
        {
          sender: 'me',
          userInputs: [
            {
              name: 'MEDIA',
              args: [
                'step1*.wav'
              ]
            }
          ]
        },
        {
          sender: 'bot',
          messageText: 'ok'
        },
        {
          sender: 'me',
          userInputs: [
            {
              name: 'MEDIA',
              args: [
                'step2*.wav'
              ]
            }
          ]
        },
        {
          sender: 'bot',
          messageText: 'goodbye!'
        }
      ]
    }))
    scriptingProvider.ExpandConvos()

    assert.equal(scriptingProvider.convos.length, 5)
    assert.equal(scriptingProvider.convos[0].header.name, 'test convo/MEDIA-L1/MEDIA-L1/MEDIA-L1')
    assert.deepEqual(scriptingProvider.convos[0].conversation.length, 6)
    assert.equal(scriptingProvider.convos[1].header.name, 'test convo/MEDIA-L2/MEDIA-L1/MEDIA-L2')
    assert.deepEqual(scriptingProvider.convos[1].conversation.length, 6)
    assert.equal(scriptingProvider.convos[2].header.name, 'test convo/MEDIA-L3/MEDIA-L1/MEDIA-L3')
    assert.deepEqual(scriptingProvider.convos[2].conversation.length, 6)
    assert.equal(scriptingProvider.convos[3].header.name, 'test convo/MEDIA-L3/MEDIA-L1/MEDIA-L4')
    assert.deepEqual(scriptingProvider.convos[3].conversation.length, 6)
    assert.equal(scriptingProvider.convos[4].header.name, 'test convo/MEDIA-L3/MEDIA-L1/MEDIA-L5')
    assert.deepEqual(scriptingProvider.convos[4].conversation.length, 6)
  })
  it('should associate utterance and media by index', async function () {
    const scriptingProvider = new ScriptingProvider(CAPS)
    await scriptingProvider.Build()
    scriptingProvider.AddUtterances({
      name: 'UTT_HELLO',
      utterances: ['UTT_HELLO_SAMPLE_1', 'UTT_HELLO_SAMPLE_2', 'UTT_HELLO_SAMPLE_3']
    })
    scriptingProvider.AddUtterances({
      name: 'UTT_BODY',
      utterances: ['UTT_BODY_SAMPLE_1']
    })
    scriptingProvider.AddUtterances({
      name: 'UTT_GOODBYE',
      utterances: ['UTT_GOODBYE_SAMPLE_1', 'UTT_GOODBYE_SAMPLE_2', 'UTT_GOODBYE_SAMPLE_3', 'UTT_GOODBYE_SAMPLE_4', 'UTT_GOODBYE_SAMPLE_5']
    })
    scriptingProvider.AddConvos(new Convo(scriptingProvider._buildScriptContext(), {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'me',
          messageText: 'UTT_HELLO'
        },
        {
          sender: 'bot',
          messageText: 'hello'
        },
        {
          sender: 'me',
          messageText: 'UTT_BODY'
        },
        {
          sender: 'bot',
          messageText: 'body'
        },
        {
          sender: 'me',
          messageText: 'UTT_GOODBYE'
        },
        {
          sender: 'bot',
          messageText: 'goodbye'
        },
        {
          sender: 'me',
          userInputs: [
            {
              name: 'MEDIA',
              args: [
                'step0*.wav'
              ]
            }
          ]
        },
        {
          sender: 'bot',
          messageText: 'hello'
        },
        {
          sender: 'me',
          userInputs: [
            {
              name: 'MEDIA',
              args: [
                'step1*.wav'
              ]
            }
          ]
        },
        {
          sender: 'bot',
          messageText: 'ok'
        },
        {
          sender: 'me',
          userInputs: [
            {
              name: 'MEDIA',
              args: [
                'step2*.wav'
              ]
            }
          ]
        },
        {
          sender: 'bot',
          messageText: 'goodbye!'
        }
      ]
    }))
    scriptingProvider.ExpandConvos()

    assert.equal(scriptingProvider.convos.length, 5)
    assert.equal(scriptingProvider.convos[0].header.name, 'test convo/UTT_HELLO-L1/UTT_BODY-L1/UTT_GOODBYE-L1/MEDIA-L1/MEDIA-L1/MEDIA-L1')
    assert.deepEqual(scriptingProvider.convos[0].conversation.length, 12)
    assert.equal(scriptingProvider.convos[1].header.name, 'test convo/UTT_HELLO-L2/UTT_BODY-L1/UTT_GOODBYE-L2/MEDIA-L2/MEDIA-L1/MEDIA-L2')
    assert.deepEqual(scriptingProvider.convos[1].conversation.length, 12)
    assert.equal(scriptingProvider.convos[2].header.name, 'test convo/UTT_HELLO-L3/UTT_BODY-L1/UTT_GOODBYE-L3/MEDIA-L3/MEDIA-L1/MEDIA-L3')
    assert.deepEqual(scriptingProvider.convos[2].conversation.length, 12)
    assert.equal(scriptingProvider.convos[3].header.name, 'test convo/UTT_HELLO-L3/UTT_BODY-L1/UTT_GOODBYE-L4/MEDIA-L3/MEDIA-L1/MEDIA-L4')
    assert.deepEqual(scriptingProvider.convos[3].conversation.length, 12)
    assert.equal(scriptingProvider.convos[4].header.name, 'test convo/UTT_HELLO-L3/UTT_BODY-L1/UTT_GOODBYE-L5/MEDIA-L3/MEDIA-L1/MEDIA-L5')
    assert.deepEqual(scriptingProvider.convos[4].conversation.length, 12)
  })
})
