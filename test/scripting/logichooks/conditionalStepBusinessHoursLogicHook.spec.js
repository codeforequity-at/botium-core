const path = require('path')
const moment = require('moment/moment')
const assert = require('chai').assert
const BotDriver = require('../../../index').BotDriver
const Capabilities = require('../../../index').Capabilities
const ConditionalBusinessHoursLogicHook = require('../../../src/scripting/logichook/logichooks/ConditionalBusinessHoursLogicHook')

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const now = moment()
      const start = moment('8:00', [moment.ISO_8601, 'HH:mm'])
      const end = moment('16:30', [moment.ISO_8601, 'HH:mm'])
      if (start.isSameOrAfter(end)) {
        if (now.isSameOrAfter(start)) {
          end.add(1, 'days')
        } else {
          start.add(-1, 'days')
        }
      }
      const businessHoursText = ['Saturday', 'Sunday'].includes(now.format('dddd'))
        ? 'it\'s non-business hours'
        : now.isBetween(start, end, 'minutes', '[]')
          ? 'it\'s business hours'
          : 'it\'s non-business hours'
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: `Hello, ${businessHoursText}` }
      queueBotSays(botMsg)
    }
  }
}

describe('convo with business hours conditional logichook', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'scripting.logichooks',
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

  it('should success', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'conditional_steps_business_hours.convo.txt')
    await this.compiler.convos[0].Run(this.container)
  })

  it('is between Monday-Friday 8:00-16:00', async function () {
    const clh = new ConditionalBusinessHoursLogicHook()
    const params = {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      start: '8:00',
      end: '16:00'
    }
    // Monday 10:00
    params.now = moment('2023-08-21T10:00:00')
    assert.isTrue(clh._isBetween(params))
    // Monday 08:00
    params.now = moment('2023-08-21T08:00:00')
    assert.isTrue(clh._isBetween(params))
    // Monday 16:00
    params.now = moment('2023-08-21T16:00:00')
    assert.isTrue(clh._isBetween(params))
    // Monday 16:01
    params.now = moment('2023-08-21T16:01:00')
    assert.isFalse(clh._isBetween(params))
    // Sunday 10:00
    params.now = moment('2023-08-20T10:00:00')
    assert.isFalse(clh._isBetween(params))
    // Friday 16:01
    params.now = moment('2023-08-25T16:01:00')
    assert.isFalse(clh._isBetween(params))
  })

  it('is between Monday-Friday 16:01-7:59', async function () {
    const clh = new ConditionalBusinessHoursLogicHook()
    const params = {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      start: '16:01',
      end: '7:59'
    }

    // Monday 17:00
    params.now = moment('2023-08-21T17:00:00')
    assert.isTrue(clh._isBetween(params))
    // Monday 05:00
    params.now = moment('2023-08-21T05:00:00')
    assert.isTrue(clh._isBetween(params))
    // Monday 16:01
    params.now = moment('2023-08-21T16:01:00')
    assert.isTrue(clh._isBetween(params))
    // Monday 07:59
    params.now = moment('2023-08-21T07:59:00')
    assert.isTrue(clh._isBetween(params))
    // Friday 23:00
    params.now = moment('2023-08-25T23:00:00')
    assert.isTrue(clh._isBetween(params))
    // Monday 16:00
    params.now = moment('2023-08-21T16:00:00')
    assert.isFalse(clh._isBetween(params))
    // Sunday 23:00
    params.now = moment('2023-08-20T23:00:00')
    assert.isFalse(clh._isBetween(params))
  })

  it('is on Saturday or Sunday', async function () {
    const clh = new ConditionalBusinessHoursLogicHook()
    const params = {
      days: ['Saturday', 'Sunday']
    }

    // Sunday 17:00
    params.now = moment('2023-08-20T17:00:00')
    assert.isTrue(clh._isBetween(params))
    // Saturday 05:00
    params.now = moment('2023-08-19T05:00:00')
    assert.isTrue(clh._isBetween(params))
    // Monday 16:01
    params.now = moment('2023-08-21T16:01:00')
    assert.isFalse(clh._isBetween(params))
    // Friday 23:00
    params.now = moment('2023-08-25T23:00:00')
    assert.isFalse(clh._isBetween(params))
  })
})
