const Capabilities = require('./Capabilities')
const Source = require('./Source')

module.exports = {
  Capabilities: {
    [Capabilities.PROJECTNAME]: 'defaultproject',
    [Capabilities.TEMPDIR]: 'botiumwork',
    [Capabilities.CLEANUPTEMPDIR]: true,
    [Capabilities.CONTAINERMODE]: 'docker',
    [Capabilities.DOCKERCOMPOSEPATH]: 'docker-compose',
    [Capabilities.DOCKERIMAGE]: 'node:boron',
    [Capabilities.DOCKERUNIQUECONTAINERNAMES]: false,
    [Capabilities.DOCKERSYSLOGPORT_RANGE]: '47100-47299',
    [Capabilities.SLACK_PUBLISHPORT_RANGE]: '46100-46299',
    [Capabilities.FACEBOOK_PUBLISHPORT_RANGE]: '46300-46499',
    [Capabilities.BOTFRAMEWORK_PUBLISHPORT_RANGE]: '46500-46699',
    [Capabilities.BOTFRAMEWORK_WEBHOOK_PORT]: 3978,
    [Capabilities.BOTFRAMEWORK_WEBHOOK_PATH]: 'api/messages',
    [Capabilities.BOTFRAMEWORK_CHANNEL_ID]: 'facebook'
  },
  Sources: {
    [Source.LOCALPATH]: '.',
    [Source.GITPATH]: 'git',
    [Source.GITBRANCH]: 'master',
    [Source.GITDIR]: '.'
  }
}
