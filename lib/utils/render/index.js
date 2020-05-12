const mjml2html = require('mjml')
const { html, text } = require('./environments')

module.exports = {
  html: html.render.bind(html),
  htmlString: html.renderString.bind(html),

  text: text.render.bind(text),
  textString: text.renderString.bind(text),

  /**
   * @param {string} templateFile 
   * @param {any} values 
   * @param {((err: undefined, res: string) => void) & ((err: any[], res: undefined) => void)} cb 
   */
  mjml(templateFile, values, cb) {
    const src = html.render(templateFile, values)
    const result = mjml2html(src)

    if (Array.isArray(result.errors) && result.errors.length > 0) {
      return cb(result.errors, undefined)
    }

    return cb(undefined, result.html)
  }
}
