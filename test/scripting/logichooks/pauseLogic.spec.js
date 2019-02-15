const assert = require('chai').assert
const moment = require('moment')
const PauseLogic = require('../../../src/scripting/logichook/PauseLogic')

describe('PauseLogic.pause', function () {
  it('positive case for pause logic', async function () {
    const pause = PauseLogic.pause
    const currentDate = new Date()
    return pause('test', ['1000'])
      .then(resolve => {
        const finishedDate = new Date()
        assert.isTrue(moment(finishedDate).diff(currentDate) >= 1000, 'pause should at least diff 1000')
      })
  })
  it('negative case for pause logic', async function () {
    const pause = PauseLogic.pause
    const currentDate = new Date()
    return pause('test', ['500'])
      .then(resolve => {
        const finishedDate = new Date()
        assert.isTrue(moment(finishedDate).diff(currentDate) < 1000, 'pause should max diff 1000')
      })
  })
  it('wrong number of args', async function () {
    const pause = PauseLogic.pause
    return pause('test', ['500', '300'])
      .catch((err) => {
        assert.isDefined(err)
        assert.instanceOf(err, Error)
      })
  })
  it('not a number as argument', async function () {
    const pause = PauseLogic.pause
    return pause('test', ['a500'])
      .catch((err) => {
        assert.isDefined(err)
        assert.instanceOf(err, Error)
      })
  })
  it('empty argument list', async function () {
    const pause = PauseLogic.pause
    return pause('test', [])
      .catch((err) => {
        assert.isDefined(err)
        assert.instanceOf(err, Error)
      })
  })
})
