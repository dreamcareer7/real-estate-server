const { html, text } = require('./environments')
const { expect } = require('chai')


module.exports = {
  html: html.render.bind(html),
  htmlString: html.renderString.bind(html),

  text: text.render.bind(text),
  textString: text.renderString.bind(text)
}
