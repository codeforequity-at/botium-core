const fs = require('fs')

const BotDriver = require('../../index').BotDriver
const Capabilities = require('../../index').Capabilities
const Source = require('../../index').Source

function assert (actual, expected) {
  if (!actual || actual.indexOf(expected) < 0) {
    console.log(`ERROR: Expected <${expected}>, got <${actual}>`)
    return false
  } else {
    console.log(`SUCCESS: Got Expected <${expected}>`)
    return true
  }
}
function fail(err) {
    console.log(`ERROR: <${err}>`)
}

const driver = new BotDriver()
  .setCapability(Capabilities.PROJECTNAME, 'IBM Watson Conversation Sample')
  .setCapability(Capabilities.CONTAINERMODE, 'watsonconversation')
  .setCapability(Capabilities.WATSONCONVERSATION_USER, '0274cb6f-3680-4cf7-bd6b-71c7f447542d')
  .setCapability(Capabilities.WATSONCONVERSATION_PASSWORD, 'ZWDE5xo02sby')
  .setCapability(Capabilities.WATSONCONVERSATION_WORKSPACE_ID, '97513bc0-c581-4bec-ac9f-ea6a8ec308a9')
  .setCapability(Capabilities.WATSONCONVERSATION_COPY_WORKSPACE, false)
  .setCapability(Capabilities.SCRIPTING_FORMAT, 'txt')
  .setCapability(Capabilities.SCRIPTING_INPUT_TYPE, 'string')

const script = fs.readFileSync('./restaurant.convo.txt').toString()

const compiler = driver.BuildCompiler()
const convos = compiler.Compile(script)
const decompiledscript = compiler.Decompile(convos)
console.log(decompiledscript)

driver.BuildFluent()
  .Compile(script)
  .RunScripts(assert, fail)
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
