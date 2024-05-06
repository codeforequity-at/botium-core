const path = require('path')
const moment = require('moment')
const assert = require('chai').assert
const BotDriver = require('../../').BotDriver
const { BotiumError } = require('../../src/scripting/BotiumError')
const Capabilities = require('../../').Capabilities
const Events = require('../../').Events

const echoConnector = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      if (msg.messageText === 'buttons') {
        botMsg.buttons = [
          { text: 'First Button' },
          { text: 'Second Button' }
        ]
      }
      queueBotSays(botMsg)
    }
  }
}

const echoConnectorMultipleBotMessages = ({ queueBotSays }) => {
  return {
    UserSays (msg) {
      const botMsg = { sender: 'bot', sourceData: msg.sourceData, messageText: msg.messageText }
      if (msg.messageText === 'Welcome') {
        botMsg.messageText = 'Welcome'
        queueBotSays(botMsg)

        setTimeout(() => {
          botMsg.messageText = 'Select an option:'
          queueBotSays(botMsg)
        }, 200)

        setTimeout(() => {
          botMsg.messageText = ''
          botMsg.buttons = [
            { text: 'First Button' },
            { text: 'Second Button' }
          ]
          queueBotSays(botMsg)
        }, 200)
      } else {
        queueBotSays(botMsg)
      }
    }
  }
}

describe('convo.transcript', function () {
  beforeEach(async function () {
    const myCaps = {
      [Capabilities.PROJECTNAME]: 'convo.transcript',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_FORCE_BOT_CONSUMED]: true
    }
    this.driver = new BotDriver(myCaps)
    this.compiler = this.driver.BuildCompiler()
    this.container = await this.driver.Build()
    await this.container.Start()

    const myCapsMultipleAssertErrors = {
      [Capabilities.PROJECTNAME]: 'convo.transcript',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS]: true
    }
    this.driverMultipleAssertErrors = new BotDriver(myCapsMultipleAssertErrors)
    this.compilerMultipleAssertErrors = this.driverMultipleAssertErrors.BuildCompiler()
    this.containerMultipleAssertErrors = await this.driverMultipleAssertErrors.Build()
    await this.containerMultipleAssertErrors.Start()

    const myCapsSkipAssertErrors = {
      [Capabilities.PROJECTNAME]: 'convo.transcript',
      [Capabilities.CONTAINERMODE]: echoConnector,
      [Capabilities.SCRIPTING_ENABLE_MULTIPLE_ASSERT_ERRORS]: true,
      [Capabilities.SCRIPTING_ENABLE_SKIP_ASSERT_ERRORS]: true,
      [Capabilities.WAITFORBOTTIMEOUT]: 500
    }
    this.driverSkipAssertErrors = new BotDriver(myCapsSkipAssertErrors)
    this.compilerSkipAssertErrors = this.driverSkipAssertErrors.BuildCompiler()
    this.containerSkipAssertErrors = await this.driverSkipAssertErrors.Build()
    await this.containerSkipAssertErrors.Start()

    const myCapsMultipleBotMessages = {
      [Capabilities.PROJECTNAME]: 'convo.transcript',
      [Capabilities.CONTAINERMODE]: echoConnectorMultipleBotMessages,
      [Capabilities.SCRIPTING_FORCE_BOT_CONSUMED]: true
    }
    this.driverMultipleBotmessages = new BotDriver(myCapsMultipleBotMessages)
    this.compilerMultipleBotmessages = this.driverMultipleBotmessages.BuildCompiler()
    this.containerMultipleBotmessages = await this.driverMultipleBotmessages.Build()
    await this.containerMultipleBotmessages.Start()
  })
  afterEach(async function () {
    await this.container.Stop()
    await this.container.Clean()
    await this.containerMultipleAssertErrors.Stop()
    await this.containerMultipleAssertErrors.Clean()
    await this.containerSkipAssertErrors.Stop()
    await this.containerSkipAssertErrors.Clean()
  })
  it('should provide transcript steps on success', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), '2steps.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isDefined(transcript)
    assert.isDefined(transcript.convoBegin)
    assert.isDefined(transcript.convoEnd)
    assert.isTrue(moment(transcript.convoBegin).isSameOrBefore(transcript.convoEnd), 'begin should be same or before end')
    assert.equal(transcript.steps.length, 4)
    transcript.steps.forEach(step => {
      assert.isDefined(step.stepBegin)
      assert.isDefined(step.stepEnd)
      assert.isTrue(moment(step.stepBegin).isSameOrBefore(step.stepEnd), 'begin should be same or before end')
    })
  })
  it('should provide transcript negated steps on success', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), '2stepsneg.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isDefined(transcript)
    assert.equal(transcript.steps.length, 2)
    assert.isTrue(transcript.steps[1].not)
  })
  it('should provide transcript optional steps on success', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), '2stepsopt.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isDefined(transcript)
    assert.equal(transcript.steps.length, 2)
  })
  it('should provide transcript optional negated steps on success', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), '2stepsoptneg.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isDefined(transcript)
    assert.equal(transcript.steps.length, 2)
  })
  it('should provide transcript optional steps on success skipping step', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), '2stepsoptskip.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isDefined(transcript)
    assert.equal(transcript.steps.length, 2)
  })
  it('should provide transcript optional steps on failing', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), '2stepsoptfollowme.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.isDefined(err.transcript)
      assert.equal(err.transcript.steps.length, 2)
      assert.equal(err.transcript.steps[0].actual.messageText, this.compiler.convos[0].conversation[0].messageText)
      assert.notEqual(err.transcript.steps[1].actual.messageText, this.compiler.convos[0].conversation[1].messageText)
      assert.isDefined(err.transcript.steps[1].err)
    }
  })
  it('should provide transcript optional steps on success with asserters', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'assertersopt.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isDefined(transcript)
    assert.equal(transcript.steps.length, 2)
  })
  it('should provide transcript optional steps on success skipping steps with asserters', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'assertersoptskip.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isDefined(transcript)
    assert.equal(transcript.steps.length, 2)
  })
  it('should provide transcript optional multiple bot steps on getting all bot messages', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'welcome_multiple_botsteps_opt.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.containerMultipleBotmessages)
    assert.isDefined(transcript)
    assert.equal(transcript.steps.length, 6)
  })
  it('should provide transcript optional multiple bot steps on not getting all bot messages', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'welcome_multiple_botsteps_opt.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isDefined(transcript)
    assert.equal(transcript.steps.length, 6)
  })
  it('should include pause in transcript steps', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), '2stepsWithPause.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    const transcript = await this.compiler.convos[0].Run(this.container)
    assert.isDefined(transcript)
    assert.isDefined(transcript.convoBegin)
    assert.isDefined(transcript.convoEnd)
    assert.isTrue(moment(transcript.convoEnd).diff(transcript.convoBegin) >= 1000, 'begin should be at least 1000 ms before end')
    assert.equal(transcript.steps.length, 4)
    assert.isTrue(moment(transcript.steps[2].stepEnd).diff(transcript.steps[2].stepBegin) >= 1000, 'begin should be at least 1000 ms before end')
  })
  it('should provide transcript steps on failing', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), '2stepsfailing.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.isDefined(err.transcript)
      assert.equal(err.transcript.steps.length, 4)
      assert.equal(err.transcript.steps[0].actual.messageText, this.compiler.convos[0].conversation[0].messageText)
      assert.equal(err.transcript.steps[1].actual.messageText, this.compiler.convos[0].conversation[1].messageText)
      assert.equal(err.transcript.steps[2].actual.messageText, this.compiler.convos[0].conversation[2].messageText)
      assert.equal(err.transcript.steps[3].expected.messageText, this.compiler.convos[0].conversation[3].messageText)
      assert.notEqual(err.transcript.steps[3].actual.messageText, this.compiler.convos[0].conversation[3].messageText)
      assert.isDefined(err.transcript.steps[3].err)
    }
  })
  it('should not fail on invalid sender', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'invalidsender.convo.txt')
    assert.equal(this.compiler.convos.length, 1)
  })
  it('should emit transcript event on success', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), '2steps.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    let transcript = null
    this.driver.on(Events.MESSAGE_TRANSCRIPT, (container, transcriptEv) => { transcript = transcriptEv })

    await this.compiler.convos[0].Run(this.container)
    assert.isDefined(transcript)
  })
  it('should emit transcript event on failure', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), '2stepsfailing.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    let transcript = null
    this.driver.on(Events.MESSAGE_TRANSCRIPT, (container, transcriptEv) => { transcript = transcriptEv })

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.isDefined(transcript)
    }
  })
  it('should handle expected JSON response', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'json-matching-key-and-value.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    let transcript = null
    this.driver.on(Events.MESSAGE_TRANSCRIPT, (container, transcriptEv) => { transcript = transcriptEv })

    await this.compiler.convos[0].Run(this.container).then(() => {
      assert.isNotNull(transcript)
      assert.equal(transcript.steps.length, 2)
      assert.isNotNull(transcript.steps[0].actual.sourceData)
    }, error => {
      assert.fail('unexpected error: ' + error)
    })
  })
  it('should handle fail with mismatching key in JSON response', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'json-mismatching-key.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    let transcript = null
    this.driver.on(Events.MESSAGE_TRANSCRIPT, (container, transcriptEv) => { transcript = transcriptEv })

    await this.compiler.convos[0].Run(this.container).then(() => {
      assert.fail('expected error')
    }, () => {
      assert.isNotNull(transcript)
    })
  })
  it('should handle fail with mismatching value in JSON response', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'json-mismatching-value.convo.txt')
    assert.equal(this.compiler.convos.length, 1)

    let transcript = null
    this.driver.on(Events.MESSAGE_TRANSCRIPT, (container, transcriptEv) => { transcript = transcriptEv })

    await this.compiler.convos[0].Run(this.container).then(() => {
      assert.fail('expected error')
    }, () => {
      assert.isDefined(transcript)
    })
  })
  it('should emit transcript with asserters', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'asserters.convo.txt')

    let transcript = null
    this.driver.on(Events.MESSAGE_TRANSCRIPT, (container, transcriptEv) => { transcript = transcriptEv })

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.isDefined(transcript)
      assert.lengthOf(transcript.steps, 2)
      assert.isDefined(transcript.steps[1].expected.asserters)
      assert.lengthOf(transcript.steps[1].expected.asserters, 1)
      assert.equal(transcript.steps[1].expected.asserters[0].name, 'BUTTONS')
      assert.lengthOf(transcript.steps[1].expected.asserters[0].args, 2)
    }
  })
  it('should throw simple error with multiple asserting errors if its disabled', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'multiple_asserting_errors.convo.txt')

    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('expected error')
    } catch (err) {
      assert.equal(
        err.transcript.err.message,
        'asserters/Line 6: Bot response (on Line 3: #me - Hello) "Hello" expected to match "Goodbye!"')
    }
  })
  it('should throw simple error with multiple asserting errors if its enabled', async function () {
    this.compilerMultipleAssertErrors.ReadScript(path.resolve(__dirname, 'convos'), 'multiple_asserting_errors.convo.txt')

    try {
      await this.compilerMultipleAssertErrors.convos[0].Run(this.containerMultipleAssertErrors)
      assert.fail('expected error')
    } catch (err) {
      assert.equal(
        err.transcript.err.message,
        'asserters/Line 6: Bot response (on Line 3: #me - Hello) "Hello" expected to match "Goodbye!",\n' +
        'Line 6: Expected button(s) with text "btn1",\n' +
        'Line 6: Expected button(s) with text "btn2"')

      assert.equal(err.transcript.err.context.input.messageText, 'Hello')
      assert.equal(err.transcript.err.context.errors[0].type, 'asserter')
      assert.equal(err.transcript.err.context.errors[0].source, 'Text Match Asserter')
      assert.equal(err.transcript.err.context.errors[1].type, 'asserter')
      assert.equal(err.transcript.err.context.errors[1].source, 'Buttons Asserter')
      assert.equal(err.transcript.err.context.errors[2].type, 'asserter')
      assert.equal(err.transcript.err.context.errors[2].source, 'Buttons Asserter')
    }
  })
  it('should throw simple error with multiple asserting errors if its enabled and assertConvoEnd fail', async function () {
    this.compilerMultipleAssertErrors.ReadScript(path.resolve(__dirname, 'convos'), 'multiple_asserting_errors.convo.txt')
    this.compilerMultipleAssertErrors.convos[0].scriptingEvents.assertConvoEnd = () => {
      throw new BotiumError('assertConvoEnd failed',
        {
          type: 'asserter',
          source: 'assertConvoEnd'
        }
      )
    }
    try {
      await this.compilerMultipleAssertErrors.convos[0].Run(this.containerMultipleAssertErrors)
      assert.fail('expected error')
    } catch (err) {
      assert.equal(
        err.transcript.err.message,
        'asserters/Line 6: Bot response (on Line 3: #me - Hello) "Hello" expected to match "Goodbye!",\n' +
        'Line 6: Expected button(s) with text "btn1",\n' +
        'Line 6: Expected button(s) with text "btn2",\n' +
        'asserters: assertConvoEnd failed')

      assert.equal(err.transcript.err.context.input.messageText, 'Hello')
      assert.equal(err.transcript.err.context.errors[0].type, 'asserter')
      assert.equal(err.transcript.err.context.errors[0].source, 'Text Match Asserter')
      assert.equal(err.transcript.err.context.errors[1].type, 'asserter')
      assert.equal(err.transcript.err.context.errors[1].source, 'Buttons Asserter')
      assert.equal(err.transcript.err.context.errors[2].type, 'asserter')
      assert.equal(err.transcript.err.context.errors[2].source, 'Buttons Asserter')
      assert.equal(err.transcript.err.context.errors[3].type, 'asserter')
      assert.equal(err.transcript.err.context.errors[3].source, 'assertConvoEnd')
    }
  })
  it('should fail on unconsumed bot reply on #me', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'botreply_not_consumed_me.convo.txt')
    assert.equal(this.compiler.convos.length, 1)
    try {
      await this.compiler.convos[0].Run(this.container)
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('There is an unread bot reply in queue') >= 0)
    }
  })
  it('should fail on unconsumed bot reply on #end', async function () {
    this.compilerMultipleAssertErrors.ReadScript(path.resolve(__dirname, 'convos'), 'botreply_not_consumed_end.convo.txt')
    assert.equal(this.compilerMultipleAssertErrors.convos.length, 1)
    try {
      await this.compilerMultipleAssertErrors.convos[0].Run(this.containerMultipleAssertErrors)
      assert.fail('should have failed')
    } catch (err) {
      assert.isTrue(err.message.indexOf('There is an unread bot reply in queue') >= 0)
    }
  })
  it('should succeed on not unconsumed bot reply on #end', async function () {
    this.compilerMultipleAssertErrors.ReadScript(path.resolve(__dirname, 'convos'), 'botreply_not_consumed_end_not.convo.txt')
    assert.equal(this.compilerMultipleAssertErrors.convos.length, 1)
    await this.compilerMultipleAssertErrors.convos[0].Run(this.containerMultipleAssertErrors)
  })
  it('should succeed on unconsumed bot reply count', async function () {
    this.compilerMultipleAssertErrors.ReadScript(path.resolve(__dirname, 'convos'), 'botreply_unconsumed_count.convo.txt')
    assert.equal(this.compilerMultipleAssertErrors.convos.length, 1)
    await this.compilerMultipleAssertErrors.convos[0].Run(this.containerMultipleAssertErrors)
  })
  it('should succeed on clearing unconsumed bot reply', async function () {
    this.compilerMultipleAssertErrors.ReadScript(path.resolve(__dirname, 'convos'), 'botreply_skip_unconsumed.convo.txt')
    assert.equal(this.compilerMultipleAssertErrors.convos.length, 1)
    await this.compilerMultipleAssertErrors.convos[0].Run(this.containerMultipleAssertErrors)
  })
  it('should continue on failing assertion', async function () {
    this.compilerSkipAssertErrors.ReadScript(path.resolve(__dirname, 'convos'), 'continuefailing.convo.txt')
    assert.equal(this.compilerSkipAssertErrors.convos.length, 1)

    try {
      await this.compilerSkipAssertErrors.convos[0].Run(this.containerSkipAssertErrors)
      assert.fail('expected error')
    } catch (err) {
      assert.isDefined(err.transcript)
      assert.equal(err.transcript.steps.length, 6)
      assert.equal(err.transcript.steps[0].actual.messageText, this.compilerSkipAssertErrors.convos[0].conversation[0].messageText)
      assert.equal(err.transcript.steps[1].actual.messageText, this.compilerSkipAssertErrors.convos[0].conversation[1].messageText)
      assert.equal(err.transcript.steps[2].actual.messageText, this.compilerSkipAssertErrors.convos[0].conversation[2].messageText)
      assert.equal(err.transcript.steps[3].expected.messageText, this.compilerSkipAssertErrors.convos[0].conversation[3].messageText)
      assert.notEqual(err.transcript.steps[3].actual.messageText, this.compilerSkipAssertErrors.convos[0].conversation[3].messageText)
      assert.isDefined(err.transcript.steps[3].err)
      assert.equal(err.transcript.steps[4].expected.messageText, this.compilerSkipAssertErrors.convos[0].conversation[4].messageText)
      assert.equal(err.transcript.steps[5].expected.messageText, this.compilerSkipAssertErrors.convos[0].conversation[5].messageText)
      assert.isNull(err.transcript.steps[5].err)
    }
  })
  it('should continue on failing assertion with timeout', async function () {
    this.compilerSkipAssertErrors.ReadScript(path.resolve(__dirname, 'convos'), 'continuefailing_timeout.convo.txt')
    assert.equal(this.compilerSkipAssertErrors.convos.length, 1)

    try {
      await this.compilerSkipAssertErrors.convos[0].Run(this.containerSkipAssertErrors)
      assert.fail('expected error')
    } catch (err) {
      assert.isDefined(err.cause)
      assert.equal(err.cause.message, 'continuefailing/Line 12: Bot response (on Line 9: #me - Hello again!) "Hello again!" expected to match "Hello again FAILING!",\ncontinuefailing/Line 15: error waiting for bot - Bot did not respond within 500ms')
      assert.equal(err.cause.context.errors.length, 2)

      assert.isDefined(err.transcript)
      assert.equal(err.transcript.steps.length, 5)
    }
  })
  it('should calculate assertion count', async function () {
    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), '2steps.convo.txt')
    assert.equal(this.compiler.convos.length, 1)
    assert.equal(this.compiler.GetAssertionCount(this.compiler.convos[0]), 2)

    this.compiler.ReadScript(path.resolve(__dirname, 'convos'), 'asserters.convo.txt')
    assert.equal(this.compiler.convos.length, 2)
    assert.equal(this.compiler.GetAssertionCount(this.compiler.convos[1]), 1)
  })
})
