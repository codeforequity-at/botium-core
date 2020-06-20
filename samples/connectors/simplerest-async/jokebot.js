const request = require('request')
const express = require('express')
const bodyParser = require('body-parser')
const _ = require('lodash')

const app = express()
app.use(bodyParser.json())

const jokes = [
  'Q: What did one watermelon say to the other on Valentine\'s Day?\nA: You\'re one in a melon!',
  'Q. Why shouldn\'t you marry a tennis player?\nA. Because Love means nothing to them.',
  'What do you call an elephant that doesn\'t matter? An irrelephant',
  'A blonde was bragging about her knowledge of state capitals. She proudly says, Go ahead, ask me, I know all of them. A friend says, OK, what\'s the capital of Wisconsin? The blonde replies, Oh, that\'s easy: W.'
]

sendAsyncText = async (req, res, text) => {
  const callbackUri = req.body.callbackUri

  return new Promise((resolve, reject) => {
    request({
      method: 'POST',
      uri: callbackUri,
      body: {
        conversationId: req.body.conversationId,
        responses: [
          {
            text
          }
        ]
      },
      json: true
    }, (err, response, body) => {
      if (err) {
        console.log('failed async response: ' + err)
        reject(err)
      } else {
        console.log('async response got response ' + response.statusCode)
        resolve()
      }
    })
  })
}

app.post('/joke', async (req, res) => {
  if (!req.body || !req.body.conversationId) {
    return res.status(500).send('no body or no conversationId given')
  }
  // asynchronous response
  await sendAsyncText(req, res, 'That\'s fine, but here is a joke for you.')
  await sendAsyncText(req, res, _.sample(jokes))

  // additional synchronous response
  res.status(200).json({
    conversationId: req.body.conversationId,
    responses: [
      {
        text: 'ok, not funny'
      },
    ]
  })
})

const port = process.env.PORT || 1234
app.listen(port, () => {
  console.log(`Joke Bot is listening on port ${port}`)
})
