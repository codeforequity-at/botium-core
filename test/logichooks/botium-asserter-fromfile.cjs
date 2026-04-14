module.exports = class DummyAsserter {
  assertConvoStep ({ botMsg }) {
    return (botMsg.messageText === 'Hello' ? Promise.resolve() : Promise.reject(new Error('expected Hello')))
  }
}
