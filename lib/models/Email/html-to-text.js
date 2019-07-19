const htmlToText = require('html-to-text')

module.exports = html => {
  return htmlToText.fromString(html, {
    ignoreImage: true,
    wordwrap: 130
  })
}
