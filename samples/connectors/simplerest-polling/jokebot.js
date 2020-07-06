const express = require('express')
const bodyParser = require('body-parser')
const _ = require('lodash')

const app = express()
app.use(bodyParser.json())

const validConversationIds = []
const oneMoreConversationIds = []

const jokes = [
  'Q: What did one watermelon say to the other on Valentine\'s Day?\nA: You\'re one in a melon!',
  'Q. Why shouldn\'t you marry a tennis player?\nA. Because Love means nothing to them.',
  'What do you call an elephant that doesn\'t matter? An irrelephant',
  'A blonde was bragging about her knowledge of state capitals. She proudly says, Go ahead, ask me, I know all of them. A friend says, OK, what\'s the capital of Wisconsin? The blonde replies, Oh, that\'s easy: W.'
]

app.post('/joke', (req, res) => {
  if (!req.body || !req.body.conversationId) {
    return res.status(500).send('no body or no conversationId given')
  }

  validConversationIds.push(req.body.conversationId)
  oneMoreConversationIds.push(req.body.conversationId)

  // synchronous response
  res.status(200).json({
    conversationId: req.body.conversationId,
    responses: [
      {
        text: 'That\'s fine, but here is a joke for you.'
      },
      {
        text: _.sample(jokes)
      }
    ]
  })
})

app.post('/onemore', (req, res) => {
  if (!req.body || !req.body.conversationId) {
    return res.status(500).send('no body or no conversationId given')
  }

  if (validConversationIds.indexOf(req.body.conversationId) >= 0) {
    if (oneMoreConversationIds.indexOf(req.body.conversationId) >= 0) {
      res.status(200).json({
        conversationId: req.body.conversationId,
        responses: [
          {
            text: 'OK, one more: ' + _.sample(jokes)
          }
        ]
      })
      oneMoreConversationIds.splice(oneMoreConversationIds.indexOf(req.body.conversationId), 1 )
    } else {
      res.status(200).json({
        conversationId: req.body.conversationId,
        responses: []
      })
    }
  } else {
    return res.status(404).send('conversationId unknown')
  }
})

const port = process.env.PORT || 1234
app.listen(port, () => {
  console.log(`Joke Bot is listening on port ${port}`)
})
