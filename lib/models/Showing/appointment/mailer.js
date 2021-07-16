const { resolve } = require('path')
const Mailer = require('../../../utils/mailer')
const { mjml } = require('../../../utils/render')
const { promisify } = require('util')

const renderMjml = promisify(mjml)

const TEMPLATES_ROOT = resolve(__dirname, '../../../mjml/showing/appointment')

class AppointmentMailer extends Mailer {
  get notification () {
    return this.object.notification
  }

  get title () {
    return this.object.title || 'Showing Appointment'
  }

  get template () {
    return this.object.template
  }
  
  get subject () {
    let subject = this.title

    if (this.notification.object?.showing?.title) {
      subject += ':' + this.notification.object.showing.title
    }
    
    return subject
  }

  get to () {
    return this.object.to
  }

  get toUserIds () {
    return this.object.toUserIds || []
  }
  
  async render () {
    // TODO: WIP
    const bindings = {}

    return renderMjml(this.template, bindings)
  }
}

AppointmentMailer.templates = {
  toSeller: tpl => resolve(TEMPLATES_ROOT, 'to-seller', `${tpl}.mjml`),
  toBuyer: tpl => resolve(TEMPLATES_ROOT, 'to-buyer', `${tpl}.mjml`),
}

module.exports = AppointmentMailer
