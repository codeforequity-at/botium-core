const fs = require('fs')

const BotDriver = require('../../index').BotDriver
const Capabilities = require('../../index').Capabilities
const Source = require('../../index').Source

const driver = new BotDriver()
  .setCapability(Capabilities.PROJECTNAME, 'IBM Watson Conversation Sample')
  .setCapability(Capabilities.CONTAINERMODE, 'watsonconversation')
  .setCapability(Capabilities.WATSONCONVERSATION_USER, '0274cb6f-3680-4cf7-bd6b-71c7f447542d')
  .setCapability(Capabilities.WATSONCONVERSATION_PASSWORD, 'ZWDE5xo02sby')
  .setCapability(Capabilities.WATSONCONVERSATION_WORKSPACE_ID, '97513bc0-c581-4bec-ac9f-ea6a8ec308a9')
  .setCapability(Capabilities.WATSONCONVERSATION_COPY_WORKSPACE, false)
  .setCapability(Capabilities.SCRIPTING_XLSX_SHEETNAMES, 'Dialogs')
  .setCapability(Capabilities.SCRIPTING_XLSX_SHEETNAMES_UTTERANCES, 'Utterances')
  .setCapability(Capabilities.SCRIPTING_XLSX_STARTROW, 2)
  .setCapability(Capabilities.SCRIPTING_XLSX_STARTCOL, 1)

driver.BuildFluent()
  .ReadScripts('convos')
  .RunScripts()
  .Exec()
  .then(() => {
    console.log('READY')
  })
  .catch((err) => {
    console.log('ERROR: ', err)
  })
