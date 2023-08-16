const path = require('path')
const moment = require('moment/moment')
const BotDriver = require('../../../index').BotDriver
const Capabilities = require('../../../index').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const start = moment('8:00', [moment.ISO_8601, 'HH:mm'])
      const end = moment('16:30', [moment.ISO_8601, 'HH:mm'])
      if (start.isSameOrAfter(end)) {
        end.add(1, 'days')
      }
      const businessHoursText = moment().isBetween(start, end, 'minutes', '[]') ? 'we are open' : 'we are closed'
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
})
