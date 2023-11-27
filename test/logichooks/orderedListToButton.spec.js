const assert = require('chai').assert

const OrderedListToButtonLogicHook = require('../../src/scripting/logichook/logichooks/OrderedListToButtonLogicHook')

describe('logichooks.orderedListToButton', function () {
  it('should convert ordered list to buttons', async function () {
    const orderedListToButtonLogicHook = new OrderedListToButtonLogicHook()
    const botMsg = {
      messageText: `0. sometext.
1.
 2.
 3.sdfdsf
 4. 3 days per week
 5.2.2
 6. 2.dfsdf
 7777.
 88euro
 `,

      buttons: [{ payload: 'existingButtonPayload', text: 'existingButtonText' }]
    }

    orderedListToButtonLogicHook.onBotPrepare({ botMsg })
    assert.equal(botMsg.buttons?.length, 9)
    assert.deepEqual(botMsg.buttons[0], { payload: 'existingButtonPayload', text: 'existingButtonText' })
    assert.deepEqual(botMsg.buttons[1], { payload: '0', text: '0' })
    assert.deepEqual(botMsg.buttons[2], { payload: '1', text: '1' })
    assert.deepEqual(botMsg.buttons[3], { payload: '2', text: '2' })
    assert.deepEqual(botMsg.buttons[4], { payload: '3', text: '3' })
    assert.deepEqual(botMsg.buttons[5], { payload: '4', text: '4' })
    assert.deepEqual(botMsg.buttons[6], { payload: '5', text: '5' })
    assert.deepEqual(botMsg.buttons[7], { payload: '6', text: '6' })
    assert.deepEqual(botMsg.buttons[8], { payload: '7777', text: '7777' })
  })
})
