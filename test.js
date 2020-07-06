const _ = require('lodash')

const _checkNormalizeText = (str) => {
  if (str && _.isArray(str)) {
    str = str.join(' ')
  } else if (str && !_.isString(str)) {
    if (str.toString) {
      str = str.toString()
    } else {
      str = `${str}`
    }
  }
  if (str) {
    // remove html tags
    console.log('vor replace p', str)
    str = str.replace(/<p[^>]*>/g, ' ')
    console.log('nach replace p', str)
    str = str.replace(/<\/p>/g, ' ')
    str = str.replace(/<br[^>]*>/g, ' ')
    str = str.replace(/<[^>]*>/g, '')
    /* eslint-disable no-control-regex */
    // remove not printable characters
    str = str.replace(/[\x00-\x1F\x7F]/g, ' ')
    /* eslint-enable no-control-regex */
    // replace html entities
    str = str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, '\'')
      .replace(/&quot;/g, '"')
    // replace two spaces with one
    str = str.replace(/\s+/g, ' ')

    str = str.split('\n').map(s => s.trim()).join('\n').trim()
  }
  return str
}

const t1 = `DEI stands for Direct Entry induction that is a 2 day program sponsored by the Advisory National Managing Partner, designed to help DEPs/DEMDs understand KPMG's strategy, structure, and culture, and to integrate their insights and experience to create value for themselves, our clients, and the firm as a whole.
&lt;p&gt;DEMD stands for Direct Entry Managing Director.&lt;/p&gt;
&lt;p&gt;DEMD stands for Direct Entry Partner.&lt;/p&gt;`

const t2 = `DEI stands for Direct Entry induction that is a 2 day program sponsored by the Advisory National Managing Partner, designed to help DEPs/DEMDs understand KPMG's strategy, structure, and culture, and to integrate their insights and experience to create value for themselves, our clients, and the firm as a whole.
&lt;p&gt;DEMD stands for Direct Entry Managing Director.&lt;/p&gt;
&lt;p&gt;DEMD stands for Direct Entry Partner.&lt;/p&gt;`

console.log(_checkNormalizeText(t1))
console.log(_checkNormalizeText(t2))

