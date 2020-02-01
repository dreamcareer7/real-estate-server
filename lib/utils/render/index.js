const { html, text } = require('./environments')

module.exports = {
  html: html.render.bind(html),
  htmlString: html.renderString.bind(html),

  text: text.render.bind(text),
  textString: text.renderString.bind(text)
}
