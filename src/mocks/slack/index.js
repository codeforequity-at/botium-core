const request = require('request')
const express = require('express')
const https = require('https')
const http = require('http')
const bodyParser = require('body-parser')
const fs = require('fs')
const url = require('url')
const tcpPortUsed = require('tcp-port-used')

var publishPort = process.env.BOTIUM_SLACK_PUBLISHPORT
if (publishPort) {
  publishPort = parseInt(publishPort)
} else {
  publishPort = 46199
}

var userIdDefault = 'U' + randomInt(1000000000, 9999999999)
var userNameDefault = process.env.BOTIUM_SLACK_USERNAME
if (!userNameDefault) {
  userNameDefault = 'BotiumUser'
}

var userIdMap = {}
userIdMap['me'] = userIdDefault
userIdMap[userNameDefault] = userIdDefault
var userNameMap = {}
userNameMap[userIdDefault] = 'me'

var botIdDefault = 'B' + randomInt(1000000000, 9999999999)
var botNameDefault = process.env.BOTIUM_SLACK_BOTNAME
if (!botNameDefault) {
  botNameDefault = 'botiumbot'
}

var teamIdDefault = 'T' + randomInt(1000000000, 9999999999)
var teamNameDefault = process.env.BOTIUM_SLACK_TEAMNAME
if (!teamNameDefault) {
  teamNameDefault = 'BotiumTeam'
}

var dmChannelIdDefault = 'D' + randomInt(1000000000, 9999999999)

var pubChannelIdDefault = 'C' + randomInt(1000000000, 9999999999)
var pubChannelNameDefault = process.env.BOTIUM_SLACK_CHANNELNAME
if (!pubChannelNameDefault) {
  pubChannelNameDefault = '#general'
}

var channelIdMap = {}
channelIdMap[pubChannelNameDefault] = pubChannelIdDefault
channelIdMap['#private'] = dmChannelIdDefault
var channelNameMap = {}
channelNameMap[pubChannelIdDefault] = pubChannelNameDefault
channelNameMap[dmChannelIdDefault] = '#private'

var authToken = process.env.BOTIUM_AUTH_TOKEN

var apiAppId = process.env.BOTIUM_APPID
if (!apiAppId) {
  apiAppId = 'AXXXXXXXXX'
}

var accessToken = 'xoxp-XXXXXXXX-XXXXXXXX-XXXXX'
var accessTokenBot = 'xoxb-XXXXXXXXXXXX-TTTTTTTTTTTTTT'

var eventurl = process.env.BOTIUM_SLACK_EVENTURL
if (!eventurl) {
  var eventport = process.env.BOTIUM_SLACK_EVENTPORT
  var eventpath = process.env.BOTIUM_SLACK_EVENTPATH
  var eventhost = process.env.BOTIUM_SLACK_EVENTHOST
  var eventprotocol = process.env.BOTIUM_SLACK_EVENTPROTOCOL

  if (!eventport || !eventhost || !eventprotocol) {
    console.log('BOTIUM_SLACK_EVENTURL env variables not set')
    process.exit(1)
  }

  eventurl = eventprotocol + '://' + eventhost + ':' + eventport + '/'
  if (eventpath) {
    eventurl += eventpath
  }
}
var oauthurl = process.env.BOTIUM_SLACK_OAUTHURL
if (!oauthurl) {
  var oauthport = process.env.BOTIUM_SLACK_OAUTHPORT
  var oauthpath = process.env.BOTIUM_SLACK_OAUTHPATH
  var oauthhost = process.env.BOTIUM_SLACK_OAUTHHOST
  var oauthprotocol = process.env.BOTIUM_SLACK_OAUTHPROTOCOL

  if (!oauthport || !oauthhost || !oauthprotocol) {
    console.log('BOTIUM_SLACK_OAUTHURL env variables not set')
    process.exit(1)
  }

  oauthurl = oauthprotocol + '://' + oauthhost + ':' + oauthport + '/'
  if (oauthpath) {
    oauthurl += oauthpath
  }
}

var appMock = express()
appMock.use(bodyParser.json())
appMock.use(bodyParser.urlencoded({ extended: true }))

appMock.post('/api/oauth.access', (req, res) => {
  console.log('/api/oauth.access: ' + JSON.stringify(req.body))

  res.json({
    access_token: accessToken,
    scope: 'read',
    team_name: teamIdDefault,
    team_id: teamIdDefault,
    incoming_webhook: {
      url: 'http://slack.com/incomingWebhook',
      channel: pubChannelNameDefault,
      configuration_url: 'http://slack.com/incomingWebhook'
    },
    bot: {
      bot_user_id: botIdDefault,
      bot_access_token: accessTokenBot
    }
  })
})

appMock.post('/api/auth.test', (req, res) => {
  console.log('/api/auth.test: ' + JSON.stringify(req.body))

  if (req.body.token === accessTokenBot) {
    res.json({
      ok: true,
      url: 'https://myteam.slack.com/',
      team: teamNameDefault,
      user: botNameDefault,
      team_id: teamIdDefault,
      user_id: botIdDefault
    })
  } else {
    res.json({
      ok: true,
      url: 'https://myteam.slack.com/',
      team: teamNameDefault,
      user: userNameDefault,
      team_id: teamIdDefault,
      user_id: userIdDefault
    })
  }
})

appMock.post('/api/im.open', (req, res) => {
  console.log('/api/im.open: ' + JSON.stringify(req.body))

  res.json({
    ok: true,
    channel: {
      id: dmChannelIdDefault
    }
  })
})

appMock.post('/api/channels.list', (req, res) => {
  res.json({
    ok: true,
    channels: [
      {
        id: pubChannelIdDefault,
        name: pubChannelNameDefault,
        created: getTs(),
        creator: userIdDefault,
        is_archived: false
      }
    ]
  })
})

appMock.post('/api/chat.postMessage', (req, res) => {
  console.log('/api/chat.postMessage: ' + JSON.stringify(req.body))

  const botMsg = {
    sourceData: req.body
  }

  if (req.body.text) {
    botMsg.messageText = req.body.text
  }
  if (req.body.channel) {
    if (channelNameMap[req.body.channel]) {
      botMsg.channel = channelNameMap[req.body.channel]
    } else {
      botMsg.channel = req.body.channel
    }
  }
  receivedFromBot(botMsg)

  res.json({
    ok: true,
    ts: getTs(),
    channel: req.body.channel,
    message: req.body
  })
})

appMock.post('/api/reactions.add', (req, res) => {
  console.log('/api/reactions.add: ' + JSON.stringify(req.body))

  const botMsg = {
    sourceData: req.body,
    messageText: ':' + req.body.name + ':'
  }
  if (req.body.channel) {
    if (channelNameMap[req.body.channel]) {
      botMsg.channel = channelNameMap[req.body.channel]
    } else {
      botMsg.channel = req.body.channel
    }
  }
  receivedFromBot(botMsg)

  res.json({
    ok: true
  })
})

appMock.all('/incomingWebhook', (req, res) => {
})

appMock.all('*', (req, res) => {
  console.log('*: ' + req.body)

  res.json({
    ok: true
  })
})

var httpsOptions = {
  key: fs.readFileSync('./127.0.0.1.key'),
  cert: fs.readFileSync('./127.0.0.1.cert')
}

https.createServer(httpsOptions, appMock).listen(443, '0.0.0.0', (err) => {
  if (err) {
    console.log('error listening 443: ' + err)
  } else {
    console.log('Mock server listening on port 443')
  }
})

var appTest = express()
appTest.use(bodyParser.json())

appTest.get('/', (req, res) => {
  var urlparts = url.parse(oauthurl)

  tcpPortUsed.check(parseInt(urlparts.port), urlparts.hostname)
    .then((inUse) => {
      console.log('port usage (' + oauthurl + '): ' + inUse)
      if (inUse) {
        console.log('checking (' + oauthurl + ') for response')
        var options = {
          uri: oauthurl,
          method: 'GET',
          qs: { code: 'C123123123', state: 'C123123123' }
        }
        request(options, (err, response, body) => {
          if (err) {
            res.status(500).send('endpoint ' + oauthurl + ' not yet online')
          } else {
            res.status(200).send('endpoint ' + oauthurl + ' online')
          }
        })
      } else {
        res.status(500).send('endpoint not yet online')
      }
    },
    (err) => {
      console.log('error on port check: ' + err)
      res.status(500).send('endpoint ' + oauthurl + ' not yet online')
    })
})

function sendToBot (mockMsg) {
  const ts = getTs()

  if (mockMsg.channel) {
    if (channelIdMap[mockMsg.channel]) {
      mockMsg.channel = channelIdMap[mockMsg.channel]
    }
  }
  if (!mockMsg.channel) {
    mockMsg.channel = dmChannelIdDefault
  }

  if (mockMsg.sender) {
    if (userIdMap[mockMsg.sender]) {
      mockMsg.sender = userIdMap[mockMsg.sender]
    }
  }
  if (!mockMsg.sender) {
    mockMsg.sender = userIdDefault
  }

  const eventContainer = {
    token: authToken,
    team_id: teamIdDefault,
    api_app_id: apiAppId,
    type: 'event_callback',
    authed_users: [
      mockMsg.sender
    ],
    event_id: ts
  }

  if (mockMsg.messageText) {
    eventContainer.event = {
      type: 'message',
      text: mockMsg.messageText
    }
  } else if (mockMsg.sourceData) {
    eventContainer.event = mockMsg.sourceData
  } else {
    console.log('No messageText or sourceData given. Ignored.', mockMsg)
    return
  }

  if (eventContainer.event.text) {
    eventContainer.event.text = eventContainer.event.text.replace('@' + botNameDefault, '<@' + botIdDefault + '|' + botNameDefault + '>')
  }

  if (!eventContainer.event.user) eventContainer.event.user = mockMsg.sender
  if (!eventContainer.event.channel) eventContainer.event.channel = mockMsg.channel
  if (!eventContainer.event.ts) eventContainer.event.ts = ts

  callWebhook(eventContainer)
}

console.log('Test server start on port ' + publishPort)

var serverTest = http.createServer(appTest).listen(publishPort, '0.0.0.0', (err) => {
  if (err) {
    console.log('error listening ' + publishPort + ': ' + err)
  } else {
    console.log('Test server listening on port ' + publishPort)
  }
})

var io = require('socket.io')(serverTest)
io.on('connection', (socket) => {
  console.log('socket connection estabilished')
  socket.on('MOCKCMD_SENDTOBOT', (mockMsg) => {
    console.log('MOCKCMD_SENDTOBOT ', mockMsg)
    sendToBot(mockMsg)
  })
})

function receivedFromBot (botMsg) {
  console.log('receivedFromBot: ', botMsg)
  io.sockets.emit('MOCKCMD_RECEIVEDFROMBOT', botMsg)
}

function getTs () {
  return (new Date()).getTime()
}

function callWebhook (msg) {
  console.log('callWebhook: ' + JSON.stringify(msg, null, 2))

  var options = {
    uri: eventurl,
    method: 'POST',
    json: msg
  }
  request(options, (err, response, body) => {
    if (err) {
      console.log('callWebhook Error: ' + err)
    } else {
      console.log('callWebhook OK')
    }
  })
}

function randomInt (low, high) {
  return Math.floor(Math.random() * (high - low) + low)
}
