const Capabilities = require('./Capabilities')
const Source = require('./Source')

module.exports = {
  Capabilities: {
    [Capabilities.PROJECTNAME]: 'defaultproject',
    [Capabilities.TEMPDIR]: 'botiumwork',
    [Capabilities.CLEANUPTEMPDIR]: true,
    [Capabilities.WAITFORBOTTIMEOUT]: 10000,
    [Capabilities.CONTAINERMODE]: 'docker',
    [Capabilities.DOCKERCOMPOSEPATH]: 'docker-compose',
    [Capabilities.DOCKERMACHINEPATH]: 'docker-machine',
    [Capabilities.DOCKERMACHINE]: false,
    [Capabilities.DOCKERIMAGE]: 'node:boron',
    [Capabilities.DOCKERUNIQUECONTAINERNAMES]: false,
    [Capabilities.DOCKERSYSLOGPORT_RANGE]: '47100-47299',
    [Capabilities.SLACK_PUBLISHPORT_RANGE]: '46100-46299',
    [Capabilities.FACEBOOK_PUBLISHPORT_RANGE]: '46300-46499',
    [Capabilities.FACEBOOK_SEND_DELIVERY_CONFIRMATION]: true,
    [Capabilities.BOTFRAMEWORK_PUBLISHPORT_RANGE]: '46500-46699',
    [Capabilities.BOTFRAMEWORK_WEBHOOK_PORT]: 3978,
    [Capabilities.BOTFRAMEWORK_WEBHOOK_PATH]: 'api/messages',
    [Capabilities.BOTFRAMEWORK_CHANNEL_ID]: 'facebook',
    [Capabilities.WATSONCONVERSATION_URL]: 'https://gateway.watsonplatform.net/conversation/api',
    [Capabilities.WATSONCONVERSATION_VERSION_DATE]: '2017-05-26',
    [Capabilities.WATSONCONVERSATION_COPY_WORKSPACE]: false,
    [Capabilities.WATSONCONVERSATION_USE_INTENT]: false,
    [Capabilities.SIMPLEREST_METHOD]: 'GET',
    [Capabilities.DIALOGFLOW_LANGUAGE_CODE]: 'en-US',
    [Capabilities.DIALOGFLOW_USE_INTENT]: false,
    [Capabilities.WEBSPEECH_SERVER_PORT]: 46050,
    [Capabilities.WEBSPEECH_LANGUAGE]: 'en-US',
    [Capabilities.WEBSPEECH_CLOSEBROWSER]: true,
    [Capabilities.SCRIPTING_TXT_EOL]: '\n',
    [Capabilities.SCRIPTING_XLSX_STARTROW]: 1,
    [Capabilities.SCRIPTING_XLSX_STARTCOL]: 'A',
    [Capabilities.SCRIPTING_NORMALIZE_TEXT]: true,
    [Capabilities.SCRIPTING_MATCHING_MODE]: 'include'
  },
  Sources: {
    [Source.LOCALPATH]: '.',
    [Source.GITPATH]: 'git',
    [Source.GITBRANCH]: 'master',
    [Source.GITDIR]: '.'
  }
}
