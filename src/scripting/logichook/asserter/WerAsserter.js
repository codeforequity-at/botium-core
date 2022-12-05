// const _ = require('lodash')
const { BotiumError } = require('../../BotiumError')
const { calculateWer } = require('../../helper')

module.exports = class WerAsserter {
  constructor (context, caps = {}) {
    this.context = context
    this.caps = caps
    this.name = 'Word Error Rate Asserter'
  }

  assertConvoStep ({ convo, convoStep, args, botMsg }) {
    if (!args || args.length < 1) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: ${this.name} - no argument given`,
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: { args }
        }
      ))
    }
    if (args.length > 2) {
      return Promise.reject(new BotiumError(`${convoStep.stepTag}: ${this.name} - too many arguments "${args}"`,
        {
          type: 'asserter',
          subtype: 'wrong parameters',
          source: this.name,
          cause: { args }
        }
      ))
    }

    /* const _prepareString = str => {
      const x = str.replace(/[.,/#!$%^&;:{}=\-_`~()]/g, '').toLowerCase()
      return x
    }

    const _getAllSubsets =
      theArray => theArray.reduce(
        (subsets, value) => subsets.concat(
          subsets.map(set => [value, ...set])
        ),
        [[]]
      ) */

    const utterance = args[0]
    const threshold = ([',', '.'].find(p => `${args[1]}`.includes(p)) ? parseFloat(args[1]) : parseInt(args[1]) / 100).toFixed(2)

    /* const botMessage = _prepareString(botMsg.messageText)
    const botMessageWords = botMessage.split(' ').map(bm => bm.trim())
    const botMessageWordsSubsets = _getAllSubsets(botMessageWords)
    const utt = _prepareString(utterance) */

    /* const wer
    for (const wildcardPart of utt.split('*').map(u => u.trim())) {
      let wer = 0
      const wordCount = wildcardPart.split(' ').length
      const subsetPhrases = botMessageWordsSubsets.filter(subset => subset.length === wordCount).map(subset => subset.reverse().join(' '))
      for (const subsetPhrase of subsetPhrases) {
        wer = Math.max(wer, speechScorer.wordErrorRate(subsetPhrase, wildcardPart).toFixed(2))
      }
    } */

    const wer = calculateWer(botMsg.messageText, utterance)

    // const wer = 0
    // const wer = speechScorer.wordErrorRate(_prepareString(botMsg.messageText), _prepareString(utterance)).toFixed(2)
    if (wer > threshold) {
      const _toPercent = (s) => `${(s * 100).toFixed(0)}%`

      return Promise.reject(new BotiumError(
        `${convoStep.stepTag}: Word Error Rate (${_toPercent(wer)}) higher than accepted (${_toPercent(threshold)})`,
        {
          type: 'asserter',
          source: this.name,
          context: {
            params: {
              args
            }
          },
          cause: {
            expected: `<=${_toPercent(threshold)}`,
            actual: `${_toPercent(wer)}`
          }
        }
      ))
    }

    return Promise.resolve()
  }
}
