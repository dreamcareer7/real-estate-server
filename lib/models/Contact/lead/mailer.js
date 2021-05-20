const Mailer = require('../../../utils/mailer')

module.exports = class extends Mailer {
  /**
   * Renders email html
   * @protected
   * @returns {Promise<string>}
   */
  async render() {
    return ''
  }
}
