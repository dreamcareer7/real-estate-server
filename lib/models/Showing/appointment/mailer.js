const { resolve } = require('path')
const Mailer = require('../../../utils/mailer')
const { mjml } = require('../../../utils/render')
const { promisify } = require('util')
const Notification = require('../../Notification/delivery')

const saveDeliveryPromise = promisify(Notification.saveDelivery)
const mjmlPromise = promisify(mjml)

const TEMPLATES_ROOT = resolve(__dirname, '../../../mjml/showing/appointment')

class AppointmentMailer extends Mailer {
  get customBindings () {
    return this.object.customBindings || {}
  }
  
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

    if (this.notification?.object?.showing?.title) {
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

  /**
   * @returns {Promise<string>}
   */
  async render () {
    return mjmlPromise(this.template, {
      ...await this.createBindings(),
      ...this.customBindings,
    })
  }

  async createBindings () {
    // TODO: WIP
    return {}
  }

  async send () {
    const result = await super.send()
    if (!this.toUserIds?.length || !this.notification?.id) { return result }
    
    for (const userId of this.toUserIds) {
      await saveDeliveryPromise(
        /* notification: */ this.notification.id,
        /* user: */ userId,
        /* token: */ null,
        /* type: */ 'email',
      )
    }

    return result
  }
}

AppointmentMailer.templates = {
  toSeller: tpl => resolve(TEMPLATES_ROOT, 'to-seller', `${tpl}.mjml`),
  toBuyer: tpl => resolve(TEMPLATES_ROOT, 'to-buyer', `${tpl}.mjml`),
}

module.exports = AppointmentMailer
