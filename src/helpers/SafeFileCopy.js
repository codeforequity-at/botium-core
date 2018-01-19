const fs = require('fs')

module.exports = (src, dest) => {
  return new Promise((resolve, reject) => {
    fs.readFile(src, (err, data) => {
      if (err) return reject(new Error(`read file ${src} failed: ${err}`))
      fs.writeFile(dest, data, (err) => {
        if (err) return reject(new Error(`write file ${dest} failed: ${err}`))
        resolve()
      })
    })
  })
}
