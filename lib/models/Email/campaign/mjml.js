const mjml2html = require('mjml')

const options = {
  minify: true // Due to templates#188 and https://github.com/mjmlio/mjml/issues/490
}

module.exports = html => {
  mjml2html(html, options).html
}
