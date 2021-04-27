const promisify = require('../../../utils/promisify')
const Notification = require('../../Notification/issue')
const ShowingAppointment = require('./get')
const Orm = {
  ...require('../../Orm/index'),
  ...require('../../Orm/context'),
}

/**
 * @param {import("../showing/types").ShowingPopulated} showing
 */
function formatShowingTitle(showing) {
  if (showing.deal) {
    return showing.deal.title
  }
  if (showing.listing) {
    return showing.listing.property.address.street_address
  }
  if (showing.address) {
    return showing.address.line1
  }
}

/**
 * @param {UUID} appointment_id
 */
async function sendAppointmentRequestNotification(appointment_id) {
  const associations = [
    'showing_appointment.showing',
    'showing_appointment.contact',
    'showing.roles',
    'showing.deal',
    'showing.listing',
  ]
  Orm.setEnabledAssociations(associations)

  const model = await ShowingAppointment.get(appointment_id)
  /** @type {[import('./types').ShowingAppointmentPopulated]} */
  const [appointment] = await Orm.populate({
    models: [model],
    associations,
  })

  const notification = {
    title: formatShowingTitle(appointment.showing),
    object: appointment.id,
    object_class: 'ShowingAppointment',
    subject: appointment.contact.id,
    subject_class: 'Contact',
    action: 'Created',
    message: '',
  }

  const usersToNotify = appointment.showing.roles
    .filter((r) => r.confirm_notification_type.length > 0)
    .map((r) => r.user_id)
  return promisify(Notification.issueForUsers)(notification, usersToNotify, {})
}

/**
 * @param {UUID} appointment_id
 * @param {string} message
 */
async function sendCancelNotificationToRoles(appointment_id, message) {
  Orm.setEnabledAssociations(['showing_appointment.contact', 'showing_appointment.showing', 'showing.roles'])
  const model = await ShowingAppointment.get(appointment_id)
  /** @type {[import('./types').ShowingAppointmentPopulated]} */
  const [appointment] = await Orm.populate({
    models: [model],
    associations: ['showing_appointment.contact', 'showing_appointment.showing', 'showing.roles'],
  })

  const notification = {
    title: formatShowingTitle(appointment.showing),
    object: appointment.id,
    object_class: 'ShowingAppointment',
    subject: appointment.contact.id,
    subject_class: 'Contact',
    action: 'Canceled',
    data: { message },
    message: '',
  }

  const usersToNotify = appointment.showing.roles
    .filter((r) => r.cancel_notification_type.length > 0)
    .map((r) => r.user_id)
  return promisify(Notification.issueForUsers)(notification, usersToNotify, {})
}

async function sendRescheduleNotificationToRoles(appointment_id, message) {
  Orm.setEnabledAssociations(['showing_appointment.contact', 'showing_appointment.showing', 'showing.roles'])
  const model = await ShowingAppointment.get(appointment_id)
  /** @type {[import('./types').ShowingAppointmentPopulated]} */
  const [appointment] = await Orm.populate({
    models: [model],
    associations: ['showing_appointment.contact', 'showing_appointment.showing', 'showing.roles'],
  })

  const notification = {
    title: formatShowingTitle(appointment.showing),
    object: appointment.id,
    object_class: 'ShowingAppointment',
    subject: appointment.contact.id,
    subject_class: 'Contact',
    action: 'Rescheduled',
    data: { message },
    message: '',
  }

  const usersToNotify = appointment.showing.roles
    .filter((r) => r.cancel_notification_type.length > 0)
    .map((r) => r.user_id)
  return promisify(Notification.issueForUsers)(notification, usersToNotify, {})
}

module.exports = {
  sendAppointmentRequestNotification,
  sendCancelNotificationToRoles,
  sendRescheduleNotificationToRoles,
}
