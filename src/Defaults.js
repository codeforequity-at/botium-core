const Capabilities = require('./Capabilities')
const Source = require('./Source')

module.exports = {
  Capabilities: {
    [Capabilities.PROJECTNAME]: 'defaultproject',
    [Capabilities.TEMPDIR]: 'botiumwork',
    [Capabilities.CLEANUPTEMPDIR]: true,
    [Capabilities.WAITFORBOTTIMEOUT]: 10000,
    [Capabilities.SIMULATE_WRITING_SPEED]: false,
    [Capabilities.DOCKERCOMPOSEPATH]: 'docker-compose',
    [Capabilities.DOCKERMACHINEPATH]: 'docker-machine',
    [Capabilities.DOCKERMACHINE]: false,
    [Capabilities.DOCKERIMAGE]: 'node:boron',
    [Capabilities.DOCKERUNIQUECONTAINERNAMES]: false,
    [Capabilities.DOCKERSYSLOGPORT_RANGE]: '47100-47299',
    [Capabilities.BOT_HEALTH_STATUS]: 200,
    [Capabilities.SLACK_PUBLISHPORT_RANGE]: '46100-46299',
    [Capabilities.FACEBOOK_PUBLISHPORT_RANGE]: '46300-46499',
    [Capabilities.FACEBOOK_SEND_DELIVERY_CONFIRMATION]: true,
    [Capabilities.BOTFRAMEWORK_PUBLISHPORT_RANGE]: '46500-46699',
    [Capabilities.BOTFRAMEWORK_WEBHOOK_PORT]: 3978,
    [Capabilities.BOTFRAMEWORK_WEBHOOK_PATH]: 'api/messages',
    [Capabilities.BOTFRAMEWORK_CHANNEL_ID]: 'facebook',
    [Capabilities.SIMPLEREST_PING_RETRIES]: 6,
    [Capabilities.SIMPLEREST_PING_TIMEOUT]: 10000,
    [Capabilities.SIMPLEREST_PING_VERB]: 'GET',
    [Capabilities.SIMPLEREST_METHOD]: 'GET',
    [Capabilities.WEBSPEECH_SERVER_PORT]: 46050,
    [Capabilities.WEBSPEECH_LANGUAGE]: 'en-US',
    [Capabilities.WEBSPEECH_CLOSEBROWSER]: true,
    [Capabilities.SCRIPTING_TXT_EOL]: '\n',
    [Capabilities.SCRIPTING_XLSX_EOL_SPLIT]: '\r',
    [Capabilities.SCRIPTING_XLSX_EOL_WRITE]: '\r\n',
    [Capabilities.SCRIPTING_XLSX_STARTROW]: 1,
    [Capabilities.SCRIPTING_XLSX_STARTCOL]: 'A',
    [Capabilities.SCRIPTING_NORMALIZE_TEXT]: true,
    [Capabilities.SCRIPTING_ENABLE_MEMORY]: false,
    [Capabilities.SCRIPTING_MATCHING_MODE]: 'includeLowerCase',
    [Capabilities.SCRIPTING_UTTEXPANSION_MODE]: 'all',
    [Capabilities.SCRIPTING_UTTEXPANSION_RANDOM_COUNT]: 1,
    [Capabilities.SCRIPTING_UTTEXPANSION_INCOMPREHENSION]: 'INCOMPREHENSION',
    [Capabilities.ASSERTERS]: [],
    [Capabilities.LOGIC_HOOKS]: [],
    [Capabilities.USER_INPUTS]: []
  },
  Sources: {
    [Source.LOCALPATH]: '.',
    [Source.GITPATH]: 'git',
    [Source.GITBRANCH]: 'master',
    [Source.GITDIR]: '.'
  },
  Envs: {
    'IS_BOTIUM_CONTAINER': true
  }
}
