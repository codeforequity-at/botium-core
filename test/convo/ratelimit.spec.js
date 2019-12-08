const assert = require('chai').assert
const moment = require('moment')
const BotDriver = require('../../').BotDriver
const Capabilities = require('../../').Capabilities

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      queueBotSays(botMsg)
    }
  }
}

const initRateLimitDriver = async ({ minTime, maxConcurrent }) => {
  const myCaps = {
    [Capabilities.PROJECTNAME]: 'convo.ratelimit',
    [Capabilities.CONTAINERMODE]: echoConnector,
    [Capabilities.RATELIMIT_USERSAYS_MINTIME]: minTime,
    [Capabilities.RATELIMIT_USERSAYS_MAXCONCURRENT]: maxConcurrent
  }
  const result = {}
  result.driver = new BotDriver(myCaps)
  result.compiler = result.driver.BuildCompiler()
  result.container = await result.driver.Build()
  await result.container.Start()
  return result
}

describe('convo.ratelimit', function () {
  it('should apply rate limit mintime', async function () {
    const { container } = await initRateLimitDriver({ minTime: 10 })

    const currentDate = new Date()
    for (let i = 0; i < 50; i++) {
      await container.UserSaysText(`HELLO ${i}`)
    }
    const finishedDate = new Date()

    await container.Stop()
    await container.Clean()

    const time = moment(finishedDate).diff(currentDate)
    // allow a little bite of uncertainty due to Node.js asynchronicity
    assert.isTrue(time >= 450, `rate limit should min diff 450 but it is ${time}`)
  })
})
