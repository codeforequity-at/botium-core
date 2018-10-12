const fs = require('fs')
const path = require('path')
const BotDriver = require('../../index').BotDriver
const Capabilities = require('../../index').Capabilities

console.log('Please make sure that botium-connector-watson module is installed before running this sample')

const driver = new BotDriver()
  .setCapability(Capabilities.SCRIPTING_XLSX_SHEETNAMES, '2-Schritt-Dialoge |    3-Schritt-Dialoge')
  .setCapability(Capabilities.SCRIPTING_XLSX_STARTROW, 2)
  .setCapability(Capabilities.SCRIPTING_XLSX_STARTCOL, 1)

const script = fs.readFileSync(path.join(__dirname, 'Book1.xlsx'))

const convos = driver.BuildCompiler().Compile(script, 'SCRIPTING_FORMAT_XSLX')
console.log(`${convos}`)

const xlsx = driver.BuildCompiler().Decompile(convos, 'SCRIPTING_FORMAT_XSLX')
fs.writeFileSync('tmp.xlsx', xlsx)
