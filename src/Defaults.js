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
    [Capabilities.DOCKERSYSLOGPORT_RANGE]: '47199-47499',
    [Capabilities.FACEBOOK_PUBLISHPORT_RANGE]: '46199-46499'
  },
  Sources: {
    [Source.LOCALPATH]: '.',
    [Source.GITPATH]: 'git',
    [Source.GITBRANCH]: 'master',
    [Source.GITDIR]: '.'
  }
}
