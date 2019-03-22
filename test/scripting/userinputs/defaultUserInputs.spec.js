const assert = require('chai').assert
const ButtonInput = require('../../../src/scripting/logichook/userinput/ButtonInput')
const MediaInput = require('../../../src/scripting/logichook/userinput/MediaInput')

const convoStep = {
  stepTag: 'MYSTEPTAG'
}

describe('UserInputs.defaults.buttonInput', function () {
  it('correct number of args', async function () {
    const bi = new ButtonInput()
    await bi.setUserInput({ convoStep, args: [ 'Test1' ], meMsg: {} })
  })
  it('wrong number of args', async function () {
    const bi = new ButtonInput()
    try {
      await bi.setUserInput({ convoStep, args: [ 'Test1', 'Test2' ], meMsg: {} })
      assert.fail('expected error')
    } catch (err) {
      assert.isDefined(err)
      assert.instanceOf(err, Error)
    }
  })
  it('empty argument list', async function () {
    const bi = new ButtonInput()
    try {
      await bi.setUserInput({ convoStep, meMsg: {} })
      assert.fail('expected error')
    } catch (err) {
      assert.isDefined(err)
      assert.instanceOf(err, Error)
    }
  })
  it('should set button in message', async function () {
    const bi = new ButtonInput()

    const meMsg = {}
    await bi.setUserInput({ convoStep, args: [ 'Test1' ], meMsg })
    assert.isArray(meMsg.buttons)
    assert.lengthOf(meMsg.buttons, 1)
    assert.equal(meMsg.buttons[0].text, 'Test1')
  })
})

describe('UserInputs.defaults.mediaInput', function () {
  it('correct number of args', async function () {
    const mi = new MediaInput()
    await mi.setUserInput({ convoStep, args: [ 'Test1' ], meMsg: {}, convo: { sourceTag: { filename: '' } } })
  })
  it('wrong number of args', async function () {
    const mi = new MediaInput()
    return mi.setUserInput({ convoStep, args: [ 'Test1', 'Test2' ], meMsg: {} })
      .then(() => assert.fail('expected error'))
      .catch((err) => {
        assert.isDefined(err)
        assert.instanceOf(err, Error)
      })
  })
  it('empty argument list', async function () {
    const mi = new MediaInput()
    return mi.setUserInput({ convoStep, meMsg: {} })
      .then(() => assert.fail('expected error'))
      .catch((err) => {
        assert.isDefined(err)
        assert.instanceOf(err, Error)
      })
  })
  it('should set media in message', async function () {
    const mi = new MediaInput()

    const meMsg = {}
    await mi.setUserInput({ convoStep, args: [ 'Test1' ], meMsg, convo: { sourceTag: { convoDir: 'mydir', filename: '' } } })
    assert.isArray(meMsg.media)
    assert.lengthOf(meMsg.media, 1)
    assert.equal(meMsg.media[0].mediaUri, `file://mydir/Test1`)
  })
})
