const config = require('../config')
const Email = require('../models/Email')

class Mailer {
  constructor(object) {
    this.object = object
  }

  get defaults() {
    return {
      mailgun_options: {
        from: 'Rechat <' + config.email.from + '>',
        'h:List-Unsubscribe': '<%unsubscribe_email%>'
      }
    }
  }

  /**
   * @protected
   * @returns {Promise<String>}
   */
  async render() {
    throw new Error('Render should be defined on the child mailer.')
  }

  async getEmailOptions() {
    const options = {
      ...this.defaults,
    }

    for (const k of ['to', 'from', 'subject', 'mailgun_options']) {
      if (this[k]) options[k] = this[k]
    }

    options.html = await this.render()

    return options
  }

  /**
   * Send an email to a user
   */
  async send() {
    const options = await this.getEmailOptions()

    return Email.create(options)
  }
}

module.exports = Mailer
