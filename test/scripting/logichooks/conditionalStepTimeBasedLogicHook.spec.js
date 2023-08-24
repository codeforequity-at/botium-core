const path = require('path')
const moment = require('moment/moment')
const assert = require('chai').assert
const BotDriver = require('../../../index').BotDriver
const Capabilities = require('../../../index').Capabilities
const ConditionalTimeBasedLogicHook = require('../../../src/scripting/logichook/logichooks/ConditionalTimeBasedLogicHook')

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
      const businessHoursText = now.isBetween(start, end, 'minutes', '[]') ? 'we are open' : 'we are closed'
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: `Hello, ${businessHoursText}` }
      queueBotSays(botMsg)
    }
  }
}

describe('convo with time based conditional logichook', function () {
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
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'conditional_steps_time_based.convo.txt')
    await this.compiler.convos[0].Run(this.container)
  })

  it('is between 8:00-16:00', async function () {
    const clh = new ConditionalTimeBasedLogicHook()
    const params = {
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
  })

  it('is between 16:01-7:59', async function () {
    const clh = new ConditionalTimeBasedLogicHook()
    const params = {
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
    // Monday 16:00
    params.now = moment('2023-08-21T16:00:00')
    assert.isFalse(clh._isBetween(params))
  })
})
