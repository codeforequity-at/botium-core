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
          buttons: [{ text: 'buttontext', payload: 'buttonpayload' }]
        }
      ]
    }

    const script = scriptingProvider.Decompile([convo], 'SCRIPTING_FORMAT_TXT')
    assert.equal(script, `test convo

#bot
BUTTONS buttontext
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
BUTTON buttonpayload
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
                  payload: 'payload2',
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
CARDS text of card|text of card2
BUTTONS text of button|text of button2
MEDIA mediaUri
`
    )
  })
})
