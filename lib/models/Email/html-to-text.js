const htmlToText = require('html-to-text')

module.exports = html => {
  htmlToText.fromString(html, {
    ignoreImage: true,
    wordwrap: 130
  })
}
