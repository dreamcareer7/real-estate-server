const db = require('../../../utils/db')
const promisify = require('../../../utils/promisify')
const Orm = {
  ...require('../../Orm/index'),
  ...require('../../Orm/context'),
}
const Notification = require('../../Notification/issue')

/**
 * @param {UUID} id
 */
async function patchStatus(id) {
  return db.update('showing/appointment/cancel', [id])
}

/**
 * @param {import('./types').ShowingAppointment} appointment
 * @param {string} message
 */
async function sendNotification(appointment, message) {
  Orm.setEnabledAssociations(['showing_appointment.contact', 'showing_appointment.showing', 'showing.roles'])
  /** @type {[import('./types').ShowingAppointmentPopulated]} */
  const [populated] = await Orm.populate({
    models: [appointment],
    associations: ['showing_appointment.contact', 'showing_appointment.showing', 'showing.roles'],
  })

  const notification = {
    title: `${populated.contact.display_name} cancelled an appointment`,
    object: populated.id,
    object_class: 'ShowingAppointment',
    subject: populated.contact.id,
    subject_class: 'Contact',
    action: 'Cancelled',
    data: {
      message: message || 'Open the notification for details',
    },
    message: '',
  }

  const usersToNotify = populated.showing.roles.filter((r) => r.cancel_notification_type.length > 0).map((r) => r.user)
  return promisify(Notification.issueForUsers)(notification, usersToNotify, {})
}

/**
 * @param {import('./types').ShowingAppointment} appointment
 * @param {string} message
 */
async function cancel(appointment, message) {
  /** @type {import('./types').AppointmentStatus[]} */
  const invalidStatusesForCancel = ['Finished', 'Cancelled']
  if (invalidStatusesForCancel.includes(appointment.status)) {
    throw Error.Validation('Cannot cancel an already concluded appointment.')
  }

  await patchStatus(appointment.id)

  await sendNotification(appointment, message)
}

module.exports = {
  cancel,
}
