const assert = require('chai').assert
const moment = require('moment')
const PauseLogic = require('../../../src/scripting/logichook/PauseLogic')

describe('PauseLogic.pause', function () {
  it('positive case for pause logic', async function () {
    const pause = PauseLogic.pause
    const currentDate = new Date()
    return pause('Test', 'test', ['1000'])
      .then(resolve => {
        const finishedDate = new Date()
        const time = moment(finishedDate).diff(currentDate)
        assert.isTrue(time >= 1000, `pause should at least diff 1000 but it is ${time}`)
      })
  })
  it('negative case for pause logic', async function () {
    const pause = PauseLogic.pause
    const currentDate = new Date()
    return pause('Test', 'test', ['500'])
      .then(resolve => {
        const finishedDate = new Date()
        const time = moment(finishedDate).diff(currentDate)
        assert.isTrue(time < 1000, `pause should max diff 1000 but it is ${time}`)
      })
  })
  it('wrong number of args', async function () {
    const pause = PauseLogic.pause
    return pause('Test', 'test', ['500', '300'])
      .catch((err) => {
        assert.isDefined(err)
        assert.instanceOf(err, Error)
      })
  })
  it('not a number as argument', async function () {
    const pause = PauseLogic.pause
    return pause('Test', 'test', ['a500'])
      .catch((err) => {
        assert.isDefined(err)
        assert.instanceOf(err, Error)
      })
  })
  it('empty argument list', async function () {
    const pause = PauseLogic.pause
    return pause('Test', 'test', [])
      .catch((err) => {
        assert.isDefined(err)
        assert.instanceOf(err, Error)
      })
  })
})
