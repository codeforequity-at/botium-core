const assert = require('chai').assert
const ScriptingProvider = require('../../../src/scripting/ScriptingProvider')
const DefaultCapabilities = require('../../../src/Defaults').Capabilities

describe('scriptingProvider.txt.decompile', function () {
  it('should decompile 2-step convo', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'me',
          messageText: 'meText'
        },
        {
          sender: 'bot',
          messageText: 'botText'
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#me
meText

#bot
botText
`
    )
  })
  it('should decompile convo with negated messageText', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'bot',
          messageText: 'botText',
          not: true
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#bot
!botText
`
    )
  })
  it('should decompile convo with optional messageText', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'bot',
          messageText: 'botText',
          optional: true
        },
        {
          sender: 'bot',
          messageText: 'botText2'
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#bot
?botText

#bot
botText2
`
    )
  })
  it('should decompile convo with optional and negated messageText', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'bot',
          messageText: 'botText',
          not: true,
          optional: true
        },
        {
          sender: 'bot',
          messageText: 'botText2',
          not: false,
          optional: false
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#bot
?!botText

#bot
botText2
`
    )
  })
  it('should fail decompile convo with optional step not followed bot step', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'bot',
          messageText: 'botText',
          not: true,
          optional: true
        }
      ]
    }

    try {
      scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'Step 1: Optional bot convo step has to be followed by a bot convo step.')
    }
  })
  it('should fail decompile convo with mixed optional step', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'bot',
          messageText: 'botText',
          not: true,
          optional: true,
          asserters: [{ name: 'BUTTONS', args: ['buttontext'], not: true, optional: false }]
        }
      ]
    }

    try {
      scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
      assert.fail('expected error')
    } catch (err) {
      assert.equal(err.message, 'Step 1: Failed to decompile conversation. Mixed optional flag is not allowed inside one step.')
    }
  })
  it('should decompile logichook', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'me',
          messageText: 'meText',
          logicHooks: [{ name: 'PAUSE', args: ['100'] }]
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#me
meText
PAUSE 100
`
    )
  })
  it('should decompile logichook without message', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'me',
          logicHooks: [{ name: 'PAUSE', args: ['100'] }]
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#me
PAUSE 100
`
    )
  })
  it('should decompile logichook with message null', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'me',
          messageText: null,
          logicHooks: [{ name: 'PAUSE', args: ['100'] }]
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#me
PAUSE 100
`
    )
  })
  it('should decompile button asserter', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'bot',
          buttons: [
            { text: 'buttontext', payload: 'buttonpayload' },
            {
              text: 'buttontext\n2',
              payload: {
                bp2: 'buttonpayload2'
              }
            }
          ]
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#bot
BUTTONS buttontext|buttontext 2
`
    )
  })
  it('should decompile button asserter with negation', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'bot',
          asserters: [{ name: 'BUTTONS', args: ['buttontext'], not: true }]
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#bot
!BUTTONS buttontext
`
    )
  })
  it('should decompile optional button asserter', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'bot',
          asserters: [{ name: 'BUTTONS', args: ['buttontext'], not: false, optional: true }]
        },
        {
          sender: 'bot',
          messageText: 'botText'
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#bot
?BUTTONS buttontext

#bot
botText
`
    )
  })
  it('should decompile optional button asserter with negation', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'bot',
          asserters: [{ name: 'BUTTONS', args: ['buttontext'], not: true, optional: true }]
        },
        {
          sender: 'bot',
          messageText: 'botText'
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#bot
?!BUTTONS buttontext

#bot
botText
`
    )
  })
  it('should decompile media asserter', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'bot',
          media: [{ mediaUri: 'test1.png' }, { mediaUri: 'test2.png' }]
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#bot
MEDIA test1.png|test2.png
`
    )
  })
  it('should decompile custom asserter', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'bot',
          asserters: [{ name: 'myasserter', args: ['arg1', 'arg2'] }]
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#bot
myasserter arg1|arg2
`
    )
  })
  it('should decompile button user input', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'me',
          messageText: 'buttontext',
          buttons: [{ text: 'buttontext', payload: 'buttonpayload' }]
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#me
BUTTON buttonpayload|buttontext
`
    )
  })
  it('should decompile button with object payload user input', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'me',
          messageText: 'buttontext',
          buttons: [{
            text: 'buttontext',
            payload: {
              bp: 'buttonpayload'
            }
          }]
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#me
BUTTON {"bp":"buttonpayload"}|buttontext
`
    )
  })
  it('should decompile media user input', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'me',
          media: [{ mediaUri: 'test1.png' }]
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#me
MEDIA test1.png
`
    )
  })
  it('should decompile media with base64 in bot response', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'me',
          media: [{ mediaUri: 'test1.png' }]
        },
        {
          sender: 'bot',
          media: [{ buffer: 'data:image/png;base64,AAAAAAAAAAAAAAAAAAAAAAAA' }]
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#me
MEDIA test1.png

#bot
MEDIA
`
    )
  })

  // class BotiumMockCard {
  //   constructor (fromJson = {}) {
  //     this.text = fromJson.text
  //     this.subtext = fromJson.subtext
  //     this.content = fromJson.content
  //     this.image = (fromJson.image ? new BotiumMockMedia(fromJson.image) : null)
  //     this.buttons = (fromJson.buttons ? fromJson.buttons.map((a) => new BotiumMockButton(a)) : null)
  //     this.media = (fromJson.media ? fromJson.media.map((a) => new BotiumMockMedia(a)) : null)
  //   }
  // }

  // this.mediaUri = fromJson.mediaUri
  // this.mimeType = fromJson.mimeType
  // this.altText = fromJson.altText

  it('should decompile card user input', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'bot',
          cards: [
            {
              text: 'text of card',
              subtext: 'subtext',
              content: 'content',
              image: {
                mediaUri: 'mediaUri',
                mimeType: 'mimeType',
                altText: 'altText'
              },
              buttons: [
                {
                  text: 'text of button',
                  payload: 'payload',
                  imageUri: 'imageUri'
                },
                {
                  text: 'text of button2',
                  payload: {
                    p2: 'payload2'
                  },
                  imageUri: 'imageUri2'
                }
              ],
              media: [
                {
                  mediaUri: 'mediaUri1',
                  mimeType: 'mimeType1',
                  altText: 'altText1'
                },
                {
                  mediaUri: 'mediaUri2',
                  mimeType: 'mimeType2',
                  altText: 'altText2'
                }
              ]
            },
            {
              text: 'text of card2'
            }
          ]
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#bot
CARDS text of card|subtext|content
BUTTONS text of button|text of button2
MEDIA mediaUri
CARDS text of card2
`
    )
  })
  it('should decompile custom user input', async function () {
    const scriptingProvider = new ScriptingProvider(DefaultCapabilities)
    await scriptingProvider.Build()

    const convo = {
      header: {
        name: 'test convo'
      },
      conversation: [
        {
          sender: 'me',
          messageText: 'some text',
          userInputs: [{ name: 'CUSTOMINPUT', args: ['arg1', 'arg2'] }]
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#me
some text
CUSTOMINPUT arg1|arg2
`
    )
  })
})
