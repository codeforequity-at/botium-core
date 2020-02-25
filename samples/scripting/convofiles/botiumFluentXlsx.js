const fs = require('fs')
const path = require('path')
const BotDriver = require('../../../index').BotDriver
const Capabilities = require('../../../index').Capabilities

console.log('Please make sure that botium-connector-watson module is installed before running this sample')

const driver = new BotDriver()

const script = fs.readFileSync(path.join(__dirname, 'Book1.xlsx'))

const convos = driver.BuildCompiler().Compile(script, 'SCRIPTING_FORMAT_XSLX')
console.log(`${convos}`)

const xlsx = driver.BuildCompiler().Decompile(convos, 'SCRIPTING_FORMAT_XSLX')
fs.writeFileSync('tmp.xlsx', xlsx)

const script1 = fs.readFileSync(path.join(__dirname, 'tmp.xlsx'))

const convos1 = driver.BuildCompiler().Compile(script1, 'SCRIPTING_FORMAT_XSLX')
console.log(`${convos1}`)
