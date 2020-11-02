const assert = require('chai').assert
const ButtonInput = require('../../../src/scripting/logichook/userinput/ButtonInput')
const MediaInput = require('../../../src/scripting/logichook/userinput/MediaInput')
const FormInput = require('../../../src/scripting/logichook/userinput/FormInput')

const convoStep = {
  stepTag: 'MYSTEPTAG'
}

describe('UserInputs.defaults.buttonInput', function () {
  it('correct number of args', async function () {
    const bi = new ButtonInput()
    await bi.setUserInput({ convoStep, args: ['Test1'], meMsg: {} })
  })
  it('wrong number of args', async function () {
    const bi = new ButtonInput()
    try {
      await bi.setUserInput({ convoStep, args: ['Test1', 'Test2'], meMsg: {} })
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
  it('should set button in message as payload', async function () {
    const bi = new ButtonInput()

    const meMsg = {}
    await bi.setUserInput({ convoStep, args: ['Test1'], meMsg })
    assert.isArray(meMsg.buttons)
    assert.lengthOf(meMsg.buttons, 1)
    assert.equal(meMsg.buttons[0].payload, 'Test1')
  })
})

describe('UserInputs.defaults.mediaInput', function () {
  it('correct number of args', async function () {
    const mi = new MediaInput({}, { SECURITY_ALLOW_UNSAFE: true })
    await mi.setUserInput({ convoStep, args: ['Test1'], meMsg: {}, convo: { sourceTag: { filename: '' } } })
  })
  it('correct number of args with buffer', async function () {
    const mi = new MediaInput()
    await mi.setUserInput({ convoStep, args: ['Test1', Buffer.from('hello')], meMsg: {}, convo: { sourceTag: { filename: '' } } })
  })
  it('wrong number of args', async function () {
    const mi = new MediaInput()
    return mi.setUserInput({ convoStep, args: ['Test1', 'Test2'], meMsg: {} })
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
    const mi = new MediaInput({}, { SECURITY_ALLOW_UNSAFE: true })

    const meMsg = {}
    await mi.setUserInput({ convoStep, args: ['Test1'], meMsg, convo: { sourceTag: { convoDir: 'mydir', filename: 'myfile.convo.txt' } } })
    assert.isArray(meMsg.media)
    assert.lengthOf(meMsg.media, 1)
    assert.isTrue(meMsg.media[0].downloadUri.endsWith('mydir/Test1'))
  })
})

describe('UserInputs.defaults.formInput', function () {
  it('correct number of args', async function () {
    const mi = new FormInput()
    await mi.setUserInput({ convoStep, args: ['NAME1', 'VALUE1'], meMsg: {}, convo: { sourceTag: { filename: '' } } })
  })
  it('wrong number of args', async function () {
    const mi = new FormInput()
    return mi.setUserInput({ convoStep, args: [], meMsg: {} })
      .then(() => assert.fail('expected error'))
      .catch((err) => {
        assert.isDefined(err)
        assert.instanceOf(err, Error)
      })
  })
  it('empty argument list', async function () {
    const mi = new FormInput()
    return mi.setUserInput({ convoStep, meMsg: {} })
      .then(() => assert.fail('expected error'))
      .catch((err) => {
        assert.isDefined(err)
        assert.instanceOf(err, Error)
      })
  })
  it('should set form boolean in message', async function () {
    const mi = new FormInput()

    const meMsg = {}
    await mi.setUserInput({ convoStep, args: ['NAME1'], meMsg, convo: { sourceTag: { convoDir: 'mydir', filename: 'myfile.convo.txt' } } })
    assert.isArray(meMsg.forms)
    assert.lengthOf(meMsg.forms, 1)
    assert.equal(meMsg.forms[0].name, 'NAME1')
    assert.isTrue(meMsg.forms[0].value)
  })
  it('should set form value in message', async function () {
    const mi = new FormInput()

    const meMsg = {}
    await mi.setUserInput({ convoStep, args: ['NAME1', 'VALUE1'], meMsg, convo: { sourceTag: { convoDir: 'mydir', filename: 'myfile.convo.txt' } } })
    assert.isArray(meMsg.forms)
    assert.lengthOf(meMsg.forms, 1)
    assert.equal(meMsg.forms[0].name, 'NAME1')
    assert.equal(meMsg.forms[0].value, 'VALUE1')
  })
  it('should set form values in message', async function () {
    const mi = new FormInput()

    const meMsg = {}
    await mi.setUserInput({ convoStep, args: ['NAME1', 'VALUE1', 'VALUE2'], meMsg, convo: { sourceTag: { convoDir: 'mydir', filename: 'myfile.convo.txt' } } })
    assert.isArray(meMsg.forms)
    assert.lengthOf(meMsg.forms, 1)
    assert.equal(meMsg.forms[0].name, 'NAME1')
    assert.isArray(meMsg.forms[0].value)
    assert.lengthOf(meMsg.forms[0].value, 2)
    assert.equal(meMsg.forms[0].value[0], 'VALUE1')
    assert.equal(meMsg.forms[0].value[1], 'VALUE2')
  })
  it('should set multiple form value in message', async function () {
    const mi = new FormInput()

    const meMsg = {}
    await mi.setUserInput({ convoStep, args: ['NAME1', 'VALUE1'], meMsg, convo: { sourceTag: { convoDir: 'mydir', filename: 'myfile.convo.txt' } } })
    await mi.setUserInput({ convoStep, args: ['NAME2', 'VALUE2'], meMsg, convo: { sourceTag: { convoDir: 'mydir', filename: 'myfile.convo.txt' } } })
    assert.isArray(meMsg.forms)
    assert.lengthOf(meMsg.forms, 2)
    assert.equal(meMsg.forms[0].name, 'NAME1')
    assert.equal(meMsg.forms[0].value, 'VALUE1')
    assert.equal(meMsg.forms[1].name, 'NAME2')
    assert.equal(meMsg.forms[1].value, 'VALUE2')
  })
})
