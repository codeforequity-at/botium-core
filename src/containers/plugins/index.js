const SimpleRestContainer = require('./SimpleRestContainer')

module.exports = (containermode) => {
  if (containermode === 'simplerest') {
    return SimpleRestContainer
  }
}
